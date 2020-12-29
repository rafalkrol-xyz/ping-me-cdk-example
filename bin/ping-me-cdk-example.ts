import * as cdk from '@aws-cdk/core';
import { VpcStack } from '../lib/vpc';
import { InstanceStack } from '../lib/instance';
import { PeeringStack } from '../lib/peering';
import { CustomerGatewayDeviceStack } from '../lib/cgd';
import { TransitGatewayStack, RoutesToTransitGatewayStack } from '../lib/tgw';

const app = new cdk.App(); // <--- you can read more about the App construct here: https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_core.App.html


/**
 * Ping Me! (Part 1: VPC Peering Using CDK)
 * https://chaosgears.com/ping-me-part-1-vpc-peering-using-cdk/
 */

// Create two VPCs
const vpcPeers = new VpcStack(app, 'VpcPeersStack', {
  vpcSetup: {
    cidrs: ['10.0.0.0/24', '10.0.1.0/24'], // <--- two non-overlapping CIDR ranges for our two VPCs
    maxAzs: 1, // <--- to keep the costs down, we'll stick to 1 availability zone per VPC (obviously, not something you'd want to do in production)
  },
});

// Create two EC2 instances, one in each VPC
new InstanceStack(app, 'InstancePeersStack', {
  vpcs: vpcPeers.createdVpcs,
});

// Establish a VPC Peering connection between the two VPCs
new PeeringStack(app, 'PeeringStack', {
  vpcs: [vpcPeers.createdVpcs[0], vpcPeers.createdVpcs[1]],
});


/**
 * Ping Me! (Part 2: Site-to-Site VPN Using CDK)
 * https://chaosgears.com/ping-me-part-2-site-to-site-vpn-using-cdk
 */

// Create a VPN source VPC
const vpcVpnSource = new VpcStack(app, 'VpcVpnSourceStack', {
  vpcSetup: {
    cidrs: ['10.0.2.0/24'],
    maxAzs: 1, // <--- to keep the costs down, we'll stick to 1 availability zone per VPC (obviously, not something you'd want to do in production)
  },
});

// Create a Customer Gateway Device in the VPN source VPC
new CustomerGatewayDeviceStack(app, 'CustomerGatewayDeviceStack', {
  vpc: vpcVpnSource.createdVpcs[0],
});

// Create a VPN destination VPC, with a Site-to-Site VPN connection to the VPN source VPC in place
const vpcVpnDestination = new VpcStack(app, 'VpcVpnDestinationStack', {
  vpcSetup: {
    cidrs: ['10.0.3.0/24'],
    maxAzs: 1, // <--- to keep the costs down, we'll stick to 1 availability zone per VPC (obviously, not something you'd want to do in production)
    vpnConnections: {
      toOnPrem: {
        ip: '52.51.199.29', // <--- grab this from the outputs of CustomerGatewayDeviceStack, e.g.: aws cloudformation describe-stacks --stack-name CustomerGatewayDeviceStack | jq '.Stacks[0].Outputs[0].OutputValue'
        staticRoutes: [
          vpcVpnSource.createdVpcs[0].vpcCidrBlock,
        ]
      }
    }
  },
});

// Create an EC2 instance that'll serve as a ping destination for the Customer Gateway Device
new InstanceStack(app, 'InstanceVpnDestinationStack', {
  vpcs: vpcVpnDestination.createdVpcs,
});


/**
 * Ping Me! (Part 3: Transit Gateway Using CDK)
 * https://chaosgears.com/ping-me-part-3-transit-gateway-using-cdk/
 */

 // Create two VPCs
const vpcsMetInTransit = new VpcStack(app, 'VpcsMetInTransitStack', {
  vpcSetup: {
    cidrs: ['10.0.4.0/24', '10.0.5.0/24'], // <--- two non-overlapping CIDR ranges for our two VPCs
    maxAzs: 1, // <--- to keep the costs down, we'll stick to 1 availability zone per VPC (obviously, not something you'd want to do in production)
  },
});

// Create two EC2 instances, one in each VPC
new InstanceStack(app, 'InstanceTransitStack', {
  vpcs: vpcsMetInTransit.createdVpcs,
});

// Create a Transit Gateway and attach both VPCs to it
new TransitGatewayStack(app, 'TransitGatewayStack', {
  vpcs: [vpcsMetInTransit.createdVpcs[0], vpcsMetInTransit.createdVpcs[1]],
});

// Create routes between both VPCs over the Transit Gateway
new RoutesToTransitGatewayStack(app, 'RoutesToTransitGatewayStack', {
  vpcs: [vpcsMetInTransit.createdVpcs[0], vpcsMetInTransit.createdVpcs[1]],
});
