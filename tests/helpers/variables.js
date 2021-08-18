const { existsSync, readFileSync } = require('fs');
const { join } = require('path');

const cert = join(__dirname, '../', '../', 'node.cert');

const CA = existsSync(cert) ? readFileSync(cert, 'utf8').split('\r\n').join('\n') : `-----BEGIN CERTIFICATE-----
MIICyTCCAbGgAwIBAgIUJDQgmGevHlxgC/8xbPyQpnVK8AQwDQYJKoZIhvcNAQEL
BQAwFDESMBAGA1UEAwwJMTI3LjAuMC4xMB4XDTIxMDgxNzE4MDExNloXDTIyMDgx
NzE4MDExNlowFDESMBAGA1UEAwwJMTI3LjAuMC4xMIIBIjANBgkqhkiG9w0BAQEF
AAOCAQ8AMIIBCgKCAQEAw9HlHk1fJMKaH/CRTfzxObuudthH1raW+KIXNty2oOd/
GNtT0MyPvjxF+dADa6+uMSgMID8jGMC9iGWbUbETh9RjrTrRGmCS1T2Y1UpL+0Rn
CEmsGk9JwkKkuVL6sO/69KiFP7q3uuwKNXnA98qQOvGDtt9Azl7pxR4kZrGhu8jt
E9YtaG4CYI1sDqJswunpyt8rwFmPAzy6da4ZvviWDT3jSpDBp+5sAo+wHz8xlD6w
gCj8pc26uuJaUHj/M7lj97lxvaDw9TGQRHYbgKleBrknQ+EuH0+4Eff3h2LE2NQL
a0catlbZMdI5n2lmoIqNFjILR8olgAjWUtQjACgh5wIDAQABoxMwETAPBgNVHREE
CDAGhwR/AAABMA0GCSqGSIb3DQEBCwUAA4IBAQA9nkkUv6N+oHTkKewG0lathc6c
LvraIRgDWcBq+lB2ELP6asoushQDqsUu7/4H7eeq4/IuMqVWvni0+wrowsjoDvUA
+5+euvNgomSGHRB9HGC7Fh4s44sPkmhmRf+l7yDST3ZzV25Hr3C1dRC9KX5UTw5r
5fKf0UqEVbTabPA0T00BfWyBCVXFiwEAS0xtsCjGP0NXo7yM7GLm42BaaN9X4Yqj
+QBpy4bDHx3jTSXzGb9TnGvRlJOC/iUkDNt9yKWi1DFi4hLalX17SKHNxBBrxIrp
vF8jb/FgKowHzv4l92LdHSnBdNVAzQdWrkrfnWAmUwqpFgSVdOZcaORwWxG9
-----END CERTIFICATE-----`;

module.exports = {
	CA,
};