import * as ec2 from '@aws-cdk/aws-ec2';
import * as cdk from '@aws-cdk/core';

interface TransitGatewayProps extends cdk.StackProps {
    vpcs: [ec2.Vpc, ec2.Vpc, ...ec2.Vpc[]]; // <--- a list of VPC objects (at least two are required) to be attached to the Transit Gateway; NB only routes between the first two VPCs will be created
}

export class TransitGatewayStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: TransitGatewayProps) {
        super(scope, id, props);

        // create a Transit Gateway
        const tgw = new ec2.CfnTransitGateway(this, 'Tgw');

        // For each supplied VPC, create a Transit Gateway attachment
        props.vpcs.forEach((vpc, index) => {
            new ec2.CfnTransitGatewayAttachment(this, `TgwVpcAttachment${index}`, {
                subnetIds: vpc.privateSubnets.map(privateSubnet => privateSubnet.subnetId),
                transitGatewayId: tgw.ref,
                vpcId: vpc.vpcId,
            });
        });

        // Output the Transit Gateway's ID
        new cdk.CfnOutput(this, 'TransitGatewayId', {
            value: tgw.ref,
            exportName: 'TransitGatewayId',
        });
    }
}

export class RoutesToTransitGatewayStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: TransitGatewayProps) {
        super(scope, id, props);

        // Add route from the private subnet of the first VPC to the second VPC over the Transit Gateway
        // NB the below was taken from: https://stackoverflow.com/questions/62525195/adding-entry-to-route-table-with-cdk-typescript-when-its-private-subnet-alread
        props.vpcs[0].privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
            new ec2.CfnRoute(this, 'RouteFromPrivateSubnetOfVpc1ToVpc2' + index, {
                destinationCidrBlock: props.vpcs[1].vpcCidrBlock,
                routeTableId,
                transitGatewayId: cdk.Fn.importValue('TransitGatewayId'), // Transit Gateway must already exist
            });
        });

        // Add route from the private subnet of the second VPC to the first VPC over the Transit Gateway
        props.vpcs[1].privateSubnets.forEach(({ routeTable: { routeTableId } }, index) => {
            new ec2.CfnRoute(this, 'RouteFromPrivateSubnetOfVpc2ToVpc1' + index, {
                destinationCidrBlock: props.vpcs[0].vpcCidrBlock,
                routeTableId,
                transitGatewayId: cdk.Fn.importValue('TransitGatewayId'), // Transit Gateway must already exist
            });
        });
    }
}
