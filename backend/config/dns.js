const dns = require('dns');

// Some ISP / router DNS servers refuse the SRV lookup that mongodb+srv:// needs
// (error: "querySrv ECONNREFUSED"). For Atlas URIs we resolve with public DNS instead.
//   DNS_SERVERS=1.1.1.1,8.8.8.8  -> use your own list
//   DNS_SERVERS=off              -> use the computer's normal DNS
const useReliableDns = (uri = '') => {
    const setting = (process.env.DNS_SERVERS || '').trim();
    if (setting.toLowerCase() === 'off') return;
    if (!setting && !uri.startsWith('mongodb+srv://')) return;

    const servers = setting ? setting.split(',').map(s => s.trim()).filter(Boolean) : ['8.8.8.8', '1.1.1.1'];
    try {
        dns.setServers(servers);
    } catch (err) {
        console.warn(`Could not set DNS servers (${servers.join(', ')}): ${err.message}`);
    }
};

module.exports = useReliableDns