import { App } from '@aws-cdk/core';
import '@aws-cdk/assert/jest';
import { stringLike } from '@aws-cdk/assert';

import { VpcStack } from '../lib/vpc';
import { InstanceStack } from '../lib/instance';
import { PeeringStack } from '../lib/peering';
import { CustomerGatewayDeviceStack } from '../lib/cgd';
import { TransitGatewayStack, RoutesToTransitGatewayStack } from '../lib/tgw';

describe('VpcStack initialized with two CIDRs and maxAZs set to 1', () => {
  const app = new App();
  const testVpcStack = new VpcStack(app, 'TestVpcStack', {
    vpcSetup: {
      cidrs: ['10.0.0.0/24', '10.0.1.0/24'],
      maxAzs: 1,
    },
  });

  test('has two VPCs', () => {
    expect(testVpcStack).toCountResources('AWS::EC2::VPC', 2);
  });

  test('has four subnets, each with a route table, a route table association and a default route', () => {
    expect(testVpcStack).toCountResources('AWS::EC2::Subnet', 4);
    expect(testVpcStack).toCountResources('AWS::EC2::RouteTable', 4);
    expect(testVpcStack).toCountResources('AWS::EC2::SubnetRouteTableAssociation', 4);
    expect(testVpcStack).toCountResources('AWS::EC2::Route', 4);
  });

  test('has two Internet Gateways and both are attached', () => {
    expect(testVpcStack).toCountResources('AWS::EC2::InternetGateway', 2);
    expect(testVpcStack).toCountResources('AWS::EC2::VPCGatewayAttachment', 2);
  });

  test('has two NAT Gateways with elastic IPs assigned', () => {
    expect(testVpcStack).toCountResources('AWS::EC2::NatGateway', 2);
    expect(testVpcStack).toCountResources('AWS::EC2::EIP', 2);
  });

  test('has two security ingress rules allowing ping from anywhere', () => {
    expect(testVpcStack).toCountResources('AWS::EC2::SecurityGroupIngress', 2);
    expect(testVpcStack).toHaveResource('AWS::EC2::SecurityGroupIngress', {
      IpProtocol: 'icmp',
      CidrIp: '0.0.0.0/0',
      ToPort: -1,
    });
  });
});


describe('InstanceStack initialized with one VPC', () => {
  const app = new App();
  const testVpcStack = new VpcStack(app, 'TestVpcStack', {
    vpcSetup: {
      cidrs: ['10.0.0.0/24'],
    },
  });
  const testInstanceStack = new InstanceStack(app, 'TestInstanceStack', {
    vpcs: testVpcStack.createdVpcs,
  });

  test('has 1 EC2 instance with the Default Security Group attached to it', () => {
    expect(testInstanceStack).toCountResources('AWS::EC2::Instance', 1);
    expect(testInstanceStack).toHaveResource('AWS::EC2::Instance', {
      SecurityGroupIds: [
        {
          'Fn::ImportValue': stringLike('TestVpcStack*DefaultSecurityGroup*'),
        }
      ]
    })
  });

  test('outputs the private IP of the EC2 instance', () => {
    expect(testInstanceStack).toHaveOutput({
      outputName: 'Instance0PrivateIp',
    })
  });
});


describe('PeeringStack initialized with two VPCs', () => {
  const app = new App();
  const testVpcStack = new VpcStack(app, 'TestVpcStack', {
    vpcSetup: {
      cidrs: ['10.0.0.0/24', '10.0.1.0/24'],
      maxAzs: 1,
    },
  });
  const testPeeringStack = new PeeringStack(app, 'TestPeeringStack', {
    vpcs: [testVpcStack.createdVpcs[0], testVpcStack.createdVpcs[1]],
  });

  test('has 1 peering connection', () => {
    expect(testPeeringStack).toCountResources('AWS::EC2::VPCPeeringConnection', 1);
  });

  test('has 2 routes (one per each of the private subnets) referencing the ID of the peering connection', () => {
    expect(testPeeringStack).toCountResources('AWS::EC2::Route', 2);
    expect(testPeeringStack).toHaveResource('AWS::EC2::Route', {
      VpcPeeringConnectionId: {
        Ref: 'Peer',
      }
    });
  });
});


describe('CustomerGatewayDeviceStack', () => {
  const app = new App();
  const testVpcStack = new VpcStack(app, 'TestVpcStack', {
    vpcSetup: {
      cidrs: ['10.0.0.0/24'],
    },
  });
  const testCustomerGatewayDeviceStack = new CustomerGatewayDeviceStack(app, 'TestCustomerGatewayDeviceStack', {
    vpc: testVpcStack.createdVpcs[0],
  });

  test('has 1 EC2 instance running Windows Server 2019 and having the source/destination check disabled', () => {
    expect(testCustomerGatewayDeviceStack).toCountResources('AWS::EC2::Instance', 1);
    expect(testCustomerGatewayDeviceStack).toHaveResource('AWS::EC2::Instance', {
      ImageId: {
        Ref: stringLike('*WindowsServer2019*'),
      },
      SourceDestCheck: false,
    });
  });

  test('has an IAM role with the AmazonSSMManagedInstanceCore policy attached that can be assumed by EC2', () => {
    expect(testCustomerGatewayDeviceStack).toHaveResource('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            'Effect': 'Allow',
            'Principal': {
              'Service': {
                'Fn::Join': [
                  '',
                  [
                    'ec2.',
                    {
                      Ref: 'AWS::URLSuffix',
                    },
                  ],
                ],
              },
            },
          },
        ],
        Version: '2012-10-17',
      },
      ManagedPolicyArns: [
        {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':iam::aws:policy/AmazonSSMManagedInstanceCore',
            ],
          ],
        },
      ],
    });
  });

  test('has an instance profile using the SsmRoleForEc2 role', () => {
    expect(testCustomerGatewayDeviceStack).toHaveResource('AWS::IAM::InstanceProfile', {
      Roles: [
        {
          Ref: stringLike('SsmRoleForEc2*'),
        },
      ],
    });
  });

  test('outputs the public IP of the EC2 instance', () => {
    expect(testCustomerGatewayDeviceStack).toHaveOutput({
      outputName: 'CustomerGatewayDevicePublicIp',
    })
  });
});


describe('TransitGatewayStack initialized with two VPCs', () => {
  const app = new App();
  const testVpcStack = new VpcStack(app, 'TestVpcStack', {
    vpcSetup: {
      cidrs: ['10.0.1.0/24', '10.0.2.0/24'],
    },
  });

  const testTransitGatewayStack = new TransitGatewayStack(app, 'TestTransitGatewayStack', {
    vpcs: [testVpcStack.createdVpcs[0], testVpcStack.createdVpcs[1]],
  });

  test('has 1 Transit Gateway with 2 attachments to it', () => {
    expect(testTransitGatewayStack).toCountResources('AWS::EC2::TransitGateway', 1);
    expect(testTransitGatewayStack).toCountResources('AWS::EC2::TransitGatewayAttachment', 2);
    expect(testTransitGatewayStack).toHaveResource('AWS::EC2::TransitGatewayAttachment', {
      TransitGatewayId: {
        Ref: 'Tgw',
      },
    });
  });

  test('outputs the ID of the Transit Gateway', () => {
    expect(testTransitGatewayStack).toHaveOutput({
      outputName: 'TransitGatewayId',
    });
  });
});


describe('RoutesToTransitGatewayStack initialized with two VPCs having one private subnet each', () => {
  const app = new App();
  const testVpcStack = new VpcStack(app, 'TestVpcStack', {
    vpcSetup: {
      cidrs: ['10.0.1.0/24', '10.0.2.0/24'],
      maxAzs: 1,
    },
  });

  const testRoutesToTransitGatewayStack = new RoutesToTransitGatewayStack(app, 'TestRoutesToTransitGatewayStack', {
    vpcs: [testVpcStack.createdVpcs[0], testVpcStack.createdVpcs[1]],
  });

  test('has 2 routes to a Transit Gateway', () => {
    expect(testRoutesToTransitGatewayStack).toCountResources('AWS::EC2::Route', 2);
    expect(testRoutesToTransitGatewayStack).toHaveResource('AWS::EC2::Route', {
      TransitGatewayId: {
        'Fn::ImportValue': 'TransitGatewayId',
      },
    });
  });
});
