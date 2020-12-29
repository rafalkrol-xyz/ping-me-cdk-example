import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2'; // <--- this module is not available from the start; remember to import it: `npm install @aws-cdk/aws-ec2`

interface VpcProps extends cdk.StackProps {
  vpcSetup: {
    cidrs: string[], // <--- each VPC will need a list of CIDRs
    maxAzs?: number, // <--- optionally the number of Availability Zones can be provided; defaults to 2 in our particular case
    vpnConnections?: { // <--- if dealing with Site-to-Site VPN, the VPN connection details can be provided
      [id: string]: ec2.VpnConnectionOptions;
    },
  };
}

export class VpcStack extends cdk.Stack {

  readonly createdVpcs: ec2.Vpc[]; // <-- create a class property for exposing the list of VPC objects

  constructor(scope: cdk.Construct, id: string, props: VpcProps) {
    super(scope, id, props);

    const createdVpcs: ec2.Vpc[] = [];

    // for each of the provided CIDR ranges, create a VPC with two /27 subnets (one public and one private) per AZ
    props.vpcSetup.cidrs.forEach((cidr, index) => {
      createdVpcs.push(new ec2.Vpc(this, 'Vpc' + index, {
        cidr,
        maxAzs: props.vpcSetup.maxAzs,
        subnetConfiguration: [
          {
            cidrMask: 27,
            name: 'public',
            subnetType: ec2.SubnetType.PUBLIC,
          },
          {
            cidrMask: 27,
            name: 'private',
            subnetType: ec2.SubnetType.PRIVATE,
          },
        ],
        vpnConnections: props.vpcSetup.vpnConnections,
      }));
    });

    // For each VPC's default security group, allow inbound ICMP (ping) requests from anywhere
    createdVpcs.forEach((vpc, index) => {
      ec2.SecurityGroup.fromSecurityGroupId(this, 'DefaultSecurityGroup' + index, vpc.vpcDefaultSecurityGroup)
        .addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.icmpPing(), 'Allow ping from anywhere');
    });

    this.createdVpcs = createdVpcs; // <-- expose the list of created VPC objects so that they can be used by different stacks
  }
}
