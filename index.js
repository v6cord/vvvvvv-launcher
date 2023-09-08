const path = require("path");
const ProtocolRegistry = require("protocol-registry");
const fs = require("fs");
const { http, https } = require('follow-redirects');
const os = require("os");
const xdg = require('@folder/xdg');
const readline = require('readline')

const dirs = xdg({
    subdir: 'VVVVVV-launcher'
});

let baseDir = path.join(dirs.data, "VVVVVV/levels");

if (os.platform() === "win32")
{
    // Windows uses the Documents folder instead
    console.log("Home directory: " + os.homedir())
    baseDir = path.join(os.homedir(), "Documents/VVVVVV/levels");
}

console.log("Base level directory: " + baseDir)

let current = process.argv[0];
let arguments = "";

if (current.includes("node"))
{
    // We're running the raw script from node,
    // so make sure to include the script name
    current += " " + process.argv[1];
}

arguments = process.argv.slice(2);

// We need to find the VVVVVV executable path from the config file

const configPath = path.join(dirs.config, "config.json");
let hasConfig = true;

let executablePath = null;

if (!fs.existsSync(configPath))
{
    hasConfig = false;
}
else
{
    executablePath = JSON.parse(fs.readFileSync(configPath)).vvvvvvPath;
}

if (arguments.length > 0)
{
    if (!hasConfig)
    {
        console.log("Config file not found, exiting...");
        process.exit(1);
    }

    console.log("Arguments: ", arguments);

    // make sure it starts with vvvvvv://

    if (!arguments[0].startsWith("vvvvvv://"))
    {
        console.log("Invalid URL");
        process.exit(1);
    }

    // remove the vvvvvv://

    const url = arguments[0].replace("vvvvvv://", "");

    // prepend https instead

    const newUrl = `https://${url}`;

    // download the URL

    const { exec } = require("child_process");

    // find documents folder

    // download the file

    console.log("Downloading file...")
    const dest = `${baseDir}/temp.zip.partial`;
    var file = fs.createWriteStream(dest);
    var filename = "unknown.zip";
    var request = https.get(newUrl, function(response) {
        filename = response.headers["content-disposition"].split("filename=")[1];
        // remove quotes surrounding filename if they exist
        if (filename.startsWith('"') && filename.endsWith('"'))
        {
            filename = filename.substring(1, filename.length - 1);
        }
        console.log("File is named " + filename);
        response.pipe(file);
        file.on('finish', function() {
            file.close();
            // rename the file
            console.log("Renaming temp.zip.partial to " + filename);
            fs.renameSync(dest, `${baseDir}/${filename}`);
            // run the executable
            console.log("Launching VVVVVV");
            const levelname = filename.split(".")[0];
            exec(`"${executablePath}" -p "${levelname}"`, (error, stdout, stderr) => {
                if (error) {
                    console.log(`error: ${error.message}`);
                    return;
                }
                if (stderr) {
                    console.log(`stderr: ${stderr}`);
                    return;
                }
                console.log(`stdout: ${stdout}`);
            });
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
    });
}
else
{
    console.log("Registering...");
    // Registers the Protocol
    ProtocolRegistry.register({
        protocol: "vvvvvv", // sets protocol for your command , testproto://**
        command: `${current} $_URL_`, // this will be executed with a extra argument %url from which it was initiated
        override: true, // Use this with caution as it will destroy all previous Registrations on this protocol
        terminal: true, // Use this to run your command inside a terminal
        script: false,
        scriptName: 'my-custom-script-name' // Custom script name.
    }).then(async () => {
        console.log("Successfully registered");

        // Ask for VVVVVV exe path

        if (!hasConfig)
        {

            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });

            rl.question('Please enter the path to your VVVVVV executable: ', (answer) => {
                rl.close();
                // create a config file
                const config = {
                    vvvvvvPath: answer
                };
                // write the config file (create it too)
                if (!fs.existsSync(dirs.config))
                {
                    fs.mkdirSync(dirs.config, { recursive: true });
                }

                fs.writeFileSync(path.join(dirs.config, "config.json"), JSON.stringify(config));
            });
        }
    });
}