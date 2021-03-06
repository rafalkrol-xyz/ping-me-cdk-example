import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';

interface PeeringProps extends cdk.StackProps {
  vpcs: [ec2.Vpc, ec2.Vpc]; // <--- a fixed-length array (a tuple type in Typescript parlance) consisting of two VPC objects between which the peering connection will be made
}

export class PeeringStack extends cdk.Stack {
  
  constructor(scope: cdk.Construct, id: string, props: PeeringProps) {
    super(scope, id, props);

    // Create the peering connection
    const peer = new ec2.CfnVPCPeeringConnection(this, 'Peer', {
      vpcId: props.vpcs[0].vpcId,
      peerVpcId: props.vpcs[1].vpcId
    });

    // Add route from the private subnet of the first VPC to the second VPC over the peering connection
    // NB the below was taken from: https://stackoverflow.com/questions/62525195/adding-entry-to-route-table-with-cdk-typescript-when-its-private-subnet-alread
    props.vpcs[0].privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
      new ec2.CfnRoute(this, 'RouteFromPrivateSubnetOfVpc1ToVpc2' + index, {
        destinationCidrBlock: props.vpcs[1].vpcCidrBlock,
        routeTableId,
        vpcPeeringConnectionId: peer.ref,
      });
    });

    // Add route from the private subnet of the second VPC to the first VPC over the peering connection
    props.vpcs[1].privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
      new ec2.CfnRoute(this, 'RouteFromPrivateSubnetOfVpc2ToVpc1' + index, {
        destinationCidrBlock: props.vpcs[0].vpcCidrBlock,
        routeTableId,
        vpcPeeringConnectionId: peer.ref,
      });
    });
  }
}
