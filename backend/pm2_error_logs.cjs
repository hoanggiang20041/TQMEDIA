const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: '103.195.238.62',
  username: 'root',
  password: 'Giangdz2004@'
}).then(async () => {
  const res = await ssh.execCommand("cat /root/.pm2/logs/tqmedia-backend-error.log | tail -n 50");
  console.log(res.stdout);
  ssh.dispose();
});
