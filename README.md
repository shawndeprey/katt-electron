# katt-electron
Code repo for the KATT reboot app.

## Project Setup

Before starting, ensure you have Git and Node.js installed on your system. This project requires both to run and build successfully.

### Prerequisites

#### Git
To check if you have Git installed, open a terminal or command prompt and run:
```bash
git --version
```
If Git is not installed, download and install it from [git-scm.com](https://git-scm.com/).

#### Node.js
Similarly, to verify Node.js installation, run:
```bash
node --version
```
And for npm (Node Package Manager):
```bash
npm --version
```
If you need to install Node.js, download it from [nodejs.org](https://nodejs.org/). Installing Node.js will automatically install npm.

### Clone the Project
With Git installed, clone the project repository to your local machine:
```bash
git clone https://github.com/shawndeprey/katt-electron.git
```

### Install Dependencies
Navigate to the project directory:
```bash
cd katt-electron
```
Install the project dependencies using npm:
```bash
npm install
```

### Running the Project Locally
To run the project on your local machine, execute:
```bash
npm start
```
This command should open the Electron app. If there are any additional steps specific to running your app, include them here.

### Building the Project
To build the project for production, use the following command(s):

The following will build for Windows devices.
```shell
npx electron-builder -w
```

The following will build for Linux devices.
```shell
npx electron-builder -l
```

The following will build for Mac devices.
```shell
npx electron-builder -m
```