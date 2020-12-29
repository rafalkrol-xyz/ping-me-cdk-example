import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

interface InstanceProps extends cdk.StackProps {
  vpcs: ec2.Vpc[]; // <--- a list of VPC objects required for the creation of the EC2 instance(s)
}

export class InstanceStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: InstanceProps) {
    super(scope, id, props);

    // For each supplied VPC, create a Linux-based EC2 instance in the private subnet and attach the VPC's default security group to it
    props.vpcs.forEach((vpc, index) => {
      const instanceName = `Instance${index}`;
      const instanceResource = new ec2.BastionHostLinux(this, instanceName, {
        vpc,
        instanceName,
        securityGroup: ec2.SecurityGroup.fromSecurityGroupId(this, instanceName + 'SecurityGroup', vpc.vpcDefaultSecurityGroup),
      });
      // Output the instance's private IP
      new cdk.CfnOutput(this, instanceName + 'PrivateIp', {
        value: instanceResource.instancePrivateIp,
      });
    });
  }
}
