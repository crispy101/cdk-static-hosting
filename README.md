# Aligent AWS Static Hosting

## Overview

This repository defines a CDK construct for hosting a static website on AWS using S3 and CloudFront. 
It can be imported and use within CDK application.

## Example
The following CDK snippet can be used to provision a static hosting stack using this construct.

```
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { StaticHosting } from '@aligent/aws-cdk-static-hosting'
import { Stack } from '@aws-cdk/core';

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

class StaticHostingStack extends Stack {
  constructor(scope: Construct, id: string, props: hostingStackProps) {
    super(scope, id, props);

    new StaticHosting(scope, 'PWA-hosting-stack', props);
  }
}
```
