# Aligent AWS Static Hosting Stack

## Overview

This repository defines a CDK stack for hosting a static website on AWS using S3 and CloudFront. 
It can be imported and use within CDK application.

## Example
The following CDK snippet can be used to provision the static hosting stack.

```
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { StaticHostingStack } from '@aligent/aws-cdk-static-hosting-stack'
import { Construct } from '@aws-cdk/core';

const hostingStackProps = {
     env: {
          region: 'ap-southeast-2',
          account: 'account-id-goes-here',
     },
     stackName: 'stack-name',
     subDomainName: 'sub.domain',
     domainName: 'domain.tld',
     certificateArn: 'arn:aws:acm:us-east-1:123456789:certificate/some-arn-id',
     createDnsRecord: true,
     createPublisherGroup: true,
     createPublisherUser: true,
};

const app = new cdk.App();

new StaticHostingStack(scope, 'PWA-hosting-stack', hostingStackProps);
```
