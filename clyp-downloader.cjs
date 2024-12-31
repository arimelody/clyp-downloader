/**
 * Clyp Downloader
 * It downloads clyps!
 *
 * @author ari melody <ari@arimelody.me>
 */

const process = require("process");
const fs = require("fs");

if (process.argv.length != 3) {
    console.log("Usage: node clyp-downloader.cjs <CLYP_TOKEN>");
    process.exit(0);
}

const TOKEN = process.argv[2];

class ClypUpload {
    /**
     * @param {string} name 
     * @param {URL} url 
     * @param {Date} creation_date 
     */
    constructor(name, url, creation_date) {
        this.name = name;
        this.url = url;
        this.id = url.pathname.split(".mp3")[0].substring(1);
        this.creation_date = creation_date;
    }
}

async function main() {
    try {
    fs.mkdirSync("mp3");
    } catch (e) {
        if (e.code != "EEXIST") {
            console.error(e);
            process.exit(1);
        }
    }

    /** @type { Array<ClypUpload> } */
    const uploads = new Array();

    let page = 1;
    const count = 10;
    while (true) {
        console.log(`Downloading metadata (Page ${page})...`);
        const res = await fetch(`https://api.clyp.it/v2/me/uploads?page=${page}&count=${count}`, {
            headers: {
                "Authorization": "Bearer " + TOKEN,
            },
        });
        const data = await res.json();
        if (!res.ok) {
            if (res.status == 401) {
                console.error("Unauthorised to Clyp API. Is your token valid?");       
            } else {
                console.error("Clyp error: " + data.Message);
            }
            process.exit(1);
        }

        data.Data.forEach(item => {
            uploads.push(new ClypUpload(
                item.Title,
                new URL(item.Mp3Url),
                new Date(item.DateCreated),
            ));
        });

        if (data.Paging["Next"] == undefined) {
            break;
        }

        page++;
    }

    const totalCount = uploads.length;
    console.log(`Metadata downloaded! Found ${totalCount} upload${totalCount != 1 ? "s" : ""}.`);

    for (let i = 0; i < totalCount; i++) {
        const upload = uploads.pop();

        const filepath = `mp3/${upload.name.replace(/[<>:"\/\\|?*]/gi, '_')} (${upload.id}).mp3`;
        console.log(`Downloading ${upload.id} "${upload.name}" (${i}/${totalCount})...`);

        const res = await fetch(upload.url)
        const blob = await res.blob()
        const arrayBuffer = await blob.arrayBuffer()
        const buffer = Buffer.alloc(arrayBuffer.byteLength);
        const array = new Uint8Array(arrayBuffer);
        for (let b = 0; b < buffer.length; b++) {
            buffer[b] = array[b];
        }

        fs.writeFile(filepath, buffer, err => {
            if (err) throw err;
            fs.utimesSync(filepath, upload.creation_date, upload.creation_date);
        });
    }

    console.log(`${totalCount} clyp${totalCount != 1 ? "s" : ""} downloaded successfully!`);
}

main();
