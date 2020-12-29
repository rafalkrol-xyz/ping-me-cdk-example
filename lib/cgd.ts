import * as cdk from '@aws-cdk/core';
import * as ec2 from '@aws-cdk/aws-ec2';
import * as iam from '@aws-cdk/aws-iam'; // <--- this module is not available from the start; remember to import it: `npm install @aws-cdk/aws-iam`

interface CustomerGatewayDeviceProps extends cdk.StackProps {
  vpc: ec2.Vpc; // <--- the VPC in which the Customer Gateway Device will be created
}

export class CustomerGatewayDeviceStack extends cdk.Stack {

  constructor(scope: cdk.Construct, id: string, props: CustomerGatewayDeviceProps) {
    super(scope, id, props);

    // Prepare the user data to be applied to the Windows EC2 instance on its initial boot-up
    const userData = ec2.UserData.forWindows();
    userData.addCommands(
      // The below PowerShell commands were taken from here: https://github.com/ACloudGuru-Resources/course-aws-certified-advanced-networking-specialty/blob/3a687ba5c70d507a53743037b8f1c5a52d05d357/SteveResources/OnPremNet.yaml#L126
      '<powershell>',
      '# Disable Internet Explorer Enhanced Security Configuration for Administrators',
      'Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Active Setup\Installed Components\{A509B1A7-37EF-4b3f-8CFC-4F3A74704073}" -Name "IsInstalled" -Value 0 -Force',
      'Stop-Process -Name iexplore -ErrorAction SilentlyContinue',
      '# Begin configuration for VPN services',
      'Set-NetAdapterAdvancedProperty -DisplayName "IPv4 Checksum Offload" -DisplayValue "Disabled"',
      'Set-NetAdapterAdvancedProperty -DisplayName "TCP Checksum Offload (IPv4)" -DisplayValue "Disabled"',
      'Set-NetAdapterAdvancedProperty -DisplayName "UDP Checksum Offload (IPv4)" -DisplayValue "Disabled"',
      'Invoke-WebRequest https://steveatacg.s3-us-west-1.amazonaws.com/advnetspec/Win2019VPNServerConfig.xml -OutFile c:\config.xml',
      'Install-WindowsFeature -ConfigurationFilePath c:\config.xml -computername $env:COMPUTERNAME -Restart',
      'Install-RemoteAccess -VpnType VpnS2S',
      '</powershell>',
    )

    // Create an IAM role allowing the instance to be managed by SSM
    const ssmRoleForEc2 = new iam.Role(this, 'SsmRoleForEc2', {
      assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
      managedPolicies: [iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')],
    });

    // Create an EC2 instance to serve as the software VPN
    const cgd = new ec2.Instance(this, 'CGW', {
      vpc: props.vpc,
      instanceType: new ec2.InstanceType('t2.micro'),
      machineImage: ec2.MachineImage.fromSSMParameter('/aws/service/ami-windows-latest/Windows_Server-2019-English-Full-Base', ec2.OperatingSystemType.WINDOWS, userData), // <--- use the latest Amazon Machine Image for Windows Server 2019
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC, // <--- place the instance in a public subnet
      },
      role: ssmRoleForEc2, // <--- use the created earlier IAM role as the instance profile
      sourceDestCheck: false, // <--- make sure the source/destination check is turned off
    });

    // Output the instance's public IP
    new cdk.CfnOutput(this, 'CustomerGatewayDevicePublicIp', {
      value: cgd.instancePublicIp,
    });
  }
}
