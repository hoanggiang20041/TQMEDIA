const { NodeSSH } = require('node-ssh');
const ssh = new NodeSSH();
ssh.connect({
  host: '103.195.238.62',
  username: 'root',
  password: 'Giangdz2004@'
}).then(async () => {
  const res = await ssh.execCommand("cat /var/www/tqmedia/backend/src/server.ts | grep -A 5 \"ADMIN\"");
  console.log(res.stdout);
  ssh.dispose();
});
