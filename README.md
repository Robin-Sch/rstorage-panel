# RStorage

RStorage is an encrypted cloud file storage.

You have one panel, which is like the "master", and then you can have multiple nodes (or one if you want) which is where the files are stored.

Uploading/Downloading takes some time, this is because of the encryption and decryption part. It depends on the CPU of your panel server.

You would want to host the panel on a high amount of CPU cores and RAM server (file encryption and decryption happens here), and the node(s) on a server with a big disk.

Note: RStorage isn't done yet, and won't function properly. Every update could break your previous installation and (as of right now) it's recommended that you reinstall everything if a new update comes out, as there's no guarantee for backwards compatibility.

You could help by looking at the what has to be done section down below and creating a PR/issue. For new suggestions please open an issue first.

## Installation

Install [nodejs](https://nodejs.org/en/download/) (if not done already previously).

Rename `.env.example` to `.env`, and fill in the environment variables. Fill in the variables starting with `PANEL_` if you want to install the panel, and fill in the variables starting with `NODE_` if you want to install a node. (To avoid confusion, you could delete the `panel` or `node` folder if you're using the other one).

If this is your first time, temporarily set `PANEL_DISABLE_REGISTER` to `false`, in order to register your account. **AFTER REGISTERING, MAKE SURE TO SET IT BACK TO TRUE AND RESTART THE PANEL!**

Optionally: you can install both if you want, although it's not recommended. For more security host the panel and the node on a separate server. Or even host multiple nodes (which all can be connected to the same panel, and your files will be spread over them)!

Run `npm i` to install the dependencies.

## Usage

If not done already, set `PANEL_DISABLE_REGISTER` to `false`, and register your first account. **After that set it back to `true` and make sure to restart the panel!** (if registering is enabled, ANYONE can register and access the files and nodes)

Run `npm run start-panel` to start the RStorage panel.

Run `npm run start-node` to start a node (note: a node can be hosted on a different server (which is recommended for better security)).

Go to your node (`localhost:3001` by default) and copy the public key.

Go to your panel (`localhost:3000` by default), login, and paste the public key (and change the ip/port if you have changed that). If you want to add more nodes, repeat the same steps (installation => copying => pasting).

Play around with `PANEL_MAX_SIZE` in the environment variables if you're getting out of memory crashes (set it lower until you get no crashes anymore).

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## What has to be done?

* login system
	* [x] basic login system
	* [x] 2fa
	* [ ] user management for admin
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
		* [ ] download/upload progress?
	* encrypting files
		* [x] encrypting on server
		* [x] big file encryption
		* [ ] encrypting on client?
	* [x] spread file contents randomly over all nodes

## Environment variables
* PANEL_MONGODB
	* This is the connection URL to a mongodb instance.

* PANEL_MAX_SIZE (Default: 8) (in megabytes)
	* This is the maximum size (in megabytes) a (decrypted) file part should be. If set to 8, that means if a file is between 8 and 16 mb, there will be 2 file parts (useful for changing if your server has a lot of memory, or if you want to spread the file more) (the lower it is, the more the file will be spread).

* PANEL_FORCE_SPREADING (Default: true)
	* This will force the spreading of a uploaded file, no matter the size (see option above).

* PANEL_DISABLE_REGISTER (Default: true)
	* This will disable being able to register new accounts.

* PANEL_PORT (Default: 3000)
	* The port the panel is listening on.

* NODE_PORT (Default: 3001)
	* The port the node is listening on.

## License
[MIT](https://choosealicense.com/licenses/mit/)
