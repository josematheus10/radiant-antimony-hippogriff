using Pulumi;
using Pulumi.Gcp.Compute;
using System.Collections.Generic;

return await Deployment.RunAsync(() =>
{
    // Define the startup script
    var startupScript = @"
        #!/bin/bash
        apt-get update
        apt-get install -y wireguard
        echo 'net.ipv4.ip_forward=1' >> /etc/sysctl.conf
        sysctl -p
        wg genkey | tee /etc/wireguard/privatekey | wg pubkey > /etc/wireguard/publickey
        echo -e '[Interface]\nAddress = 10.0.0.1/24\nPrivateKey = $(cat /etc/wireguard/privatekey)\nListenPort = 51820\n' > /etc/wireguard/wg0.conf
        systemctl enable wg-quick@wg0
        systemctl start wg-quick@wg0
    ";

    // Create a network with MTU size set to 1360
    var network = new Network("vpn-network", new NetworkArgs
    {
        AutoCreateSubnetworks = false,
        Mtu = 1360, // Set MTU size to 1360
        Region = "southamerica-east1" // São Paulo region
    });

    // Create a subnetwork
    var subnetwork = new Subnetwork("vpn-subnetwork", new SubnetworkArgs
    {
        IpCidrRange = "10.0.0.0/24",
        Network = network.Id,
        Region = "southamerica-east1"
    });

    // Create a firewall rule to allow UDP traffic on port 51820 (default WireGuard port)
    var firewall = new Firewall("firewall", new FirewallArgs
    {
        Network = network.Id,
        Allows = new[]
        {
            new FirewallAllowArgs
            {
                Protocol = "udp",
                Ports = new[] { "51820" }
            }
        }
    });

    // Create the GCE instance
    var instance = new Instance("vpn-instance", new InstanceArgs
    {
        MachineType = "f1-micro",
        BootDisk = new InstanceBootDiskArgs
        {
            InitializeParams = new InstanceBootDiskInitializeParamsArgs
            {
                Image = "debian-cloud/debian-11"
            }
        },
        NetworkInterfaces = new[]
        {
            new InstanceNetworkInterfaceArgs
            {
                Network = network.Id,
                Subnetwork = subnetwork.Id,
                AccessConfigs = new[]
                {
                    new InstanceNetworkInterfaceAccessConfigArgs
                    {
                        // Ephemeral IP
                    }
                }
            }
        },
        MetadataStartupScript = startupScript,
        Zone = "southamerica-east1-a" // São Paulo zone
    });

    return new Dictionary<string, object?>
    {
        ["instanceName"] = instance.Name,
        ["instanceIP"] = instance.NetworkInterfaces.Apply(ni => ni[0].AccessConfigs[0].NatIp)
    };
});