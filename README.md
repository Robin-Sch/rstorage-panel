# RStorage

RStorage is an encrypted cloud file storage.

To not confuse things, `node`, or `Node` means `rstorage-node` or `RStorage Node`, and `nodejs` means [`node.js`](https://nodejs.org/).

## How does RStorage work?

### Panel

You have **one** panel, which is like the "master", server-side encryption and decryption happens on this one, so you probably want to host this at your own PC, or on a high secured server.

The panel should have a lot of CPU power, as file encryption and decryption is done here.

You can have one node, but also multiple nodes connected to one panel (this is recommended, the file will be spread over all the connected node(s) (See `PANEL_FORCE_SPREADING` below)).

### Node

You can have as many nodes as you want, and here are the encrypted files stored. These can be run on anything, your PC, a server, a server of your friend etc. etc.. The files are encrypted and the decryption key is only known to the panel. However, you should still secure this.

A node should have a lot of disk storage, as the encrypted files are stored here.

**I'm not taking any responsibilty for lost files, hacked files or any problems with RStorage. You're the owner of your data, not me. This is just a tool to help you.**

You should always keep a (encrypted) backup, and for sensitive files always use something like [gpg](https://gnupg.org/) or another encryption program.

Note: RStorage isn't done yet, and won't function properly. Every update could break your previous installation and (as of right now) it's recommended that you reinstall everything if a new update comes out, as there's no guarantee for backwards compatibility.

You can help by looking at the what has to be done section down below, or search for `TODO` in the code. For new suggestions please open an issue first.

## Installation

Install [nodejs](https://nodejs.org/en/download/) (if not done already previously).

### Node
```
git clone https://github.com/Robin-floss/rstorage-node
cd rstorage-node
npm i
```

Rename `.env.example` to `.env`, and fill in the environment variables.

```
npm start
```

### Panel
```
git clone https://github.com/Robin-floss/rstorage-panel
cd rstorage-panel
npm i
```

Rename `.env.example` to `.env`, and fill in the environment variables.

```
npm start
```

Go to your panel (`localhost:3000` by default) and login with email `admin` and password `admin`.

**MAKE SURE TO CHANGE DEFAULT PASSWORD** (and if you want, email can be changed too! **BUT DON'T CHANGE THE USERNAME**)!

## Usage
### Node
```
npm start
```

Go to your node (`localhost:3001` by default) and copy the public key.

### Panel
```
npm start
```

Play around with `PANEL_MAX_SIZE` in the environment variables if you're getting out of memory crashes (set it lower until you get no crashes anymore).

Go to your panel (`localhost:3000` by default), login, and paste the public key (and change the ip/port if you have changed that). If you want to add more nodes, repeat the same steps (installation => copying => pasting).

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## What has to be done?

* login system
	* [x] basic login system
	* [x] 2fa
	* [x] user management
	* [x] user permissions
	* [ ] email verification + password reset
* connecting node to panel
	* [x] generating key pair on both panel and node
	* [x] connect using the node's public key
	* [x] editing a node's details
	* [x] deleting a node's details
* storing files
	* browsing files (storing unencrypted)
		* [x] viewing files
		* [x] uploading files
		* [x] deleting files
		* [x] downloading files
		* [x] creating directories
		* [x] download/upload progress
		* [ ] sharing files?
	* encrypting files
		* [x] encrypting on server
		* [x] worker threads for encrypting
		* [ ] worker threads for decrypting
		* [ ] encrypting on client?
	* [x] spread file contents randomly over all nodes
* tests
	* [ ] node tests
	* [ ] panel tests

## Environment variables
* PANEL_MAX_SIZE (Default: 8) (in megabytes)
	* This is the maximum size (in megabytes) a (decrypted) file part should be. If set to 8, that means if a file is between 8 and 16 mb, there will be 2 file parts (useful for changing if your server has a lot of memory, or if you want to spread the file more) (the lower it is, the more the file will be spread).

* PANEL_FORCE_SPREADING (Default: true)
	* This will force the spreading of a uploaded file, no matter the size (see option above).

* PANEL_DISABLE_REGISTER (Default: true)
	* This will disable being able to register new accounts.
	* You shouldn't give others people access to your panel, because every file uploaded (by you) is accessable (with the correct permissions (by default, new accounts get 777))! But if you REALLY REALLY REALLY want them to create a new account, it's possible with this variable.

* PANEL_PORT (Default: 3000)
	* The port the panel is listening on.

* NODE_PORT (Default: 3001)
	* The port the node is listening on.

## License
[MIT](https://choosealicense.com/licenses/mit/)
