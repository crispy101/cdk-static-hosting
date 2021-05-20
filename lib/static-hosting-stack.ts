import { Construct, CfnOutput, RemovalPolicy, StackProps, Stack} from '@aws-cdk/core';
import { Bucket, BucketEncryption, BlockPublicAccess } from '@aws-cdk/aws-s3';
import { OriginAccessIdentity, CloudFrontWebDistribution, PriceClass, ViewerProtocolPolicy, SecurityPolicyProtocol, SSLMethod } from '@aws-cdk/aws-cloudfront';
import { HostedZone, RecordTarget, ARecord } from '@aws-cdk/aws-route53';
import { CloudFrontTarget } from '@aws-cdk/aws-route53-targets';
import { User, Group, Policy, PolicyStatement, Effect } from '@aws-cdk/aws-iam';

import { countResources } from '@aws-cdk/assert';

export interface ResourceProps extends StackProps {
    subDomainName: string;
    domainName: string;
    certificateArn: string;
    createDnsRecord?: boolean;
    createPublisherGroup?: boolean;
    createPublisherUser?: boolean;
    extraDistributionCnames?: ReadonlyArray<string>;
    enableCloudFrontAccessLogging?: boolean;
}

export class StaticHostingStack extends Stack {
    constructor(scope: Construct, id: string, props: ResourceProps) {
        super(scope, id);

        const siteName = `${props.subDomainName}.${props.domainName}`;
        const siteNameArray: Array<string> = [siteName];

        let distributionCnames: Array<string> = (props.extraDistributionCnames) ?
        siteNameArray.concat(props.extraDistributionCnames) :
        siteNameArray;

        const bucket = new Bucket(this, 'ContentBucket', {
            bucketName: siteName,
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        });

        new CfnOutput(this, 'Bucket', {
            description: 'BucketName',
            value: bucket.bucketName,
        });

        const oai = new OriginAccessIdentity(this, 'OriginAccessIdentity', {
            comment: 'Allow CloudFront to access S3',
        });

        bucket.grantRead(oai);

        const publisherUser = (props.createPublisherUser)
            ? new User(this, 'PublisherUser', {
                userName: `publisher-${siteName}`,
            })
            : undefined;

        if (publisherUser) {
            new CfnOutput(this, 'PublisherUserName', {
                description: 'PublisherUser',
                value: publisherUser.userName,
            });
        };

        const publisherGroup = (props.createPublisherGroup)
            ? new Group(this, 'PublisherGroup')
            : undefined;

        if (publisherGroup) {
            bucket.grantReadWrite(publisherGroup);

            new CfnOutput(this, 'PublisherGroupName', {
                description: 'PublisherGroup',
                value: publisherGroup.groupName,
            });

            if (publisherUser) {
                publisherGroup.addUser(publisherUser);
            };
        };
 
        const loggingBucket = (props.enableCloudFrontAccessLogging)
            ? new Bucket(this, 'LoggingBucket', {
                bucketName: `${siteName}-access-logs`,
                encryption: BucketEncryption.S3_MANAGED,
                blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
                removalPolicy: RemovalPolicy.RETAIN,
            })
            : undefined;

        if (loggingBucket) {
            loggingBucket.grantWrite(oai);

            new CfnOutput(this, 'LoggingBucketName', {
                description: "CloudFront Logs",
                value: loggingBucket.bucketName,
            });
        }

        const loggingConfig = (loggingBucket)
            ? { bucket: loggingBucket }
            : undefined

        const distribution = new CloudFrontWebDistribution(this, 'BucketCdn', {
            aliasConfiguration: {
                acmCertRef: props.certificateArn,
                names: distributionCnames,
                securityPolicy: SecurityPolicyProtocol.TLS_V1_2_2018,
                sslMethod: SSLMethod.SNI,
            },
            originConfigs: [{
                s3OriginSource: {
                    s3BucketSource: bucket,
                    originAccessIdentity: oai,
                },
                behaviors: [{
                    isDefaultBehavior: true,
                }]
            }],
            errorConfigurations: [{
                errorCode: 404,
                errorCachingMinTtl: 0,
                responseCode: 200,
                responsePagePath: '/index.html',
            }],
            priceClass: PriceClass.PRICE_CLASS_ALL,
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            loggingConfig: loggingConfig,
        });

        if(publisherGroup) {
            const cloudFrontInvalidationPolicyStatement = new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['cloudfront:CreateInvalidation', 'cloudfront:GetInvalidation', 'cloudfront:ListInvalidations'],
                resources: [`arn:aws:cloudfront::*:distribution/${distribution.distributionId}`],
            });

            const cloudFrontInvalidationPolicy = new Policy(this, 'CloudFrontInvalidationPolicy', {
                groups: [publisherGroup],
                statements: [cloudFrontInvalidationPolicyStatement],
            });
        };

        new CfnOutput(this, 'DistributionId', {
            description: 'DistributionId',
            value: distribution.distributionId,
        });
        new CfnOutput(this, 'DistributionDomainName', {
            description: 'DistributionDomainName',
            value: distribution.domainName,
        });

        if (props.createDnsRecord) {
            const zone = HostedZone.fromLookup(this, 'Zone', { domainName: props.domainName });

            new ARecord(this, 'SiteAliasRecord', {
                recordName: siteName,
                target: RecordTarget.fromAlias(new CloudFrontTarget(distribution)),
                zone: zone,
            });
        };
    };
};
