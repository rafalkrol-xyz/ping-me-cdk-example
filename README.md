# Ping Me! A CDK example repository

## Overview

This repo serves as a supplement to a mini-series of articles on building selected AWS network resources using CDK that was first published on [Chaos Gears' blog](https://chaosgears.com/blog/):

+ [Ping Me! (Intro: IaC and Prep Work)](https://chaosgears.com/ping-me-intro-iac-and-prep-work)
+ [Ping Me! (Part 1: VPC Peering Using CDK)](https://chaosgears.com/ping-me-part-1-vpc-peering-using-cdk/)
+ [Ping Me! (Part 2: Site-to-Site VPN Using CDK)](https://chaosgears.com/ping-me-part-2-site-to-site-vpn-using-cdk)
+ [Ping Me! (Part 3: Transit Gateway Using CDK)](https://chaosgears.com/ping-me-part-3-transit-gateway-using-cdk/)

## Prerequisites

a) access, with [adequate permissions](https://stackoverflow.com/questions/57118082/what-iam-permissions-are-needed-to-use-cdk-deploy), to [an AWS account](https://aws.amazon.com/premiumsupport/knowledge-center/create-and-activate-aws-account/)

b) [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) that's properly [configured](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)

c) [Node v10.3 or higher](https://nodejs.org/en/)

+ I recommend installing it with [NVM](https://github.com/nvm-sh/nvm), e.g.:

```bash
nvm install v14.14.0
nvm use v14.14.0
```

d) [CDK](https://docs.aws.amazon.com/cdk/latest/guide/home.html)

```bash
npm install -g aws-cdk
```

e) [TypeScript](https://www.typescriptlang.org/)

```bash
npm install -g typescript
```

## Useful commands

+ `npm run build`   compile typescript to js
+ `npm run watch`   watch for changes and compile
+ `npm run test`    perform the jest unit tests
+ `cdk deploy`      deploy this stack to your default AWS account/region
+ `cdk diff`        compare deployed stack with current state
+ `cdk synth`       emits the synthesized CloudFormation template
