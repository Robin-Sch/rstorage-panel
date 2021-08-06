# RStorage

RStorage is an encrypted cloud file storage.

You have one panel, which is like the "master", and then you can have multiple nodes (or one if you want) which is where the files are stored.

Note: RStorage isn't done yet, and won't function properly. You could help by looking at the what has to be done section down below and creating a PR/issue.

## Installation

Install [nodejs](https://nodejs.org/en/download/).

Rename `.env.example` to `.env`, and fill in the secrets.

Run `npm i` to install the dependencies.

## Usage

Run `npm run start-panel` to start the RStorage panel.

Run `npm run start-node` to start a node.

Go to your node (`localhost:3001` by default) and copy the public key.

Go to your panel (`localhost:3000` by default), login, and paste the public key (and change the ip/port if you have changed that).

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## What has to be done?

* login system
	* [x] basic login system
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
	* encrypting files
		* [ ] encrypting on server
		* [ ] encrypting on client?
	* [ ] spread file contents over all nodes?

## License
[MIT](https://choosealicense.com/licenses/mit/)
