/* Install: npm install node-fetch
 * Run: node get-build.js [REPO] [BRANCH]
 * This script automatically takes the latest build from given repo and branch
 * and places it to labelo/static/<REPO>
*/
const fs = require('fs');
const {Readable} = require("stream")
const {finished} = require('stream/promises')
const {spawn} = require('child_process');
const path = require('path');

const dir = path.resolve(__dirname, 'build-tmp');
const TOKEN = process.env.GITHUB_TOKEN;

// coloring for console output
const RED = "\033[0;31m";
const NC = "\033[0m"; // NO COLOR to reset coloring

const PROJECTS = {
  'lsf': 'heartexlabs/label-studio-frontend',
  'dm': 'heartexlabs/dm2',
};

const DIST_DIR = "/dist";

/**
 * @param {string} ref commit or branch
 */
async function get(projectName, ref = 'master') {
  /** @type {Response} */
  let res;
  let json, sha, branch = '';

  const REPO = PROJECTS[projectName || 'lsf'];

  if (!REPO) {
    const repos = Object.entries(PROJECTS).map(a => "\t" + a.join("\t")).join("\n");

    console.error(`\n${RED}Cannot fetch from repo ${REPO}.${NC}\nOnly available:\n${repos}`);
    throw new Error();
  }

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }

  if (ref.length < 30 || ref.indexOf("/") > -1) {
    const commitUrl = `https://api.github.com/repos/${REPO}/git/ref/heads/${ref}`;

    console.info(`Fetching ${commitUrl}`);
    res = await fetch(commitUrl, {headers: {Authorization: `token ${TOKEN}`}});
    json = await res.json();

    if (!json || !json.object) {
      console.log(`\n${RED}Wrong response from GitHub. Check that you use correct GITHUB_TOKEN and given branch was successfully built.${NC}`);
      console.log(json);
      throw new Error();
    }

    sha = json.object.sha;
    console.info(`Last commit in ${ref}:`, sha);
    branch = ref;
  } else {
    sha = ref;
  }

  console.info(`Build link: ${REPO}@${sha}`);

  const artifactName = `LSF-${sha}`;
  const artifactsUrl = `https://api.github.com/repos/${REPO}/actions/artifacts?name=${artifactName}`;

  res = await fetch(artifactsUrl, {headers: {Authorization: `token ${TOKEN}`}});
  json = await res.json();

  const artifact = json.artifacts.at(0);

  if (!artifact) throw new Error(`Artifact for commit ${sha} was not found. Build failed?`);
  const buildUrl = artifact.archive_download_url;

  console.info('Found an artifact:', buildUrl);

  res = await fetch(buildUrl, {headers: {Authorization: `token ${TOKEN}`}});

  const filename = `${dir}/${sha}.zip`;

  console.info('Create write stream:', filename);
  const fileStream = fs.createWriteStream(filename);

  await new Promise(async (resolve, reject) => {
    try {
      await finished(Readable.fromWeb(res.body).pipe(fileStream))
    } catch (err) {
      reject(err)
    }

    console.info('Downloaded:', filename);
    const unzip = spawn('unzip', ['-d', dir, '-o', filename]);

    unzip.stderr.on('data', reject);
    unzip.on('close', resolve);
  }).then(() => console.log('Build unpacked'));

  const commitInfoUrl = `https://api.github.com/repos/${REPO}/git/commits/${sha}`;

  res = await fetch(commitInfoUrl, {headers: {Authorization: `token ${TOKEN}`}});
  json = await res.json();
  const info = {
    message: json.message.split('\n')[0],
    commit: json.sha,
    branch,
    date: (json.author && json.author.date) || (json.committer && json.committer.date),
  };

  const files = fs.readdirSync(dir);
  const tarFiles = files.filter(file => path.extname(file) === '.tar');
  var staticPath = path.join(dir, 'static');
  if (tarFiles.length > 0) {
    staticPath = path.join(dir, 'build', 'static');
  }

  for (var tarFile of tarFiles) {
    await new Promise(async (resolve, reject) => {

      console.log(`Unpacking ${tarFile}`);
      const unzip = spawn('tar', ['-xf', `${dir}/${tarFile}`, '-C', dir]);

      unzip.stderr.on('data', reject);
      unzip.on('close', resolve);
    }).then(() => {
      console.log(`${tarFile} unpacked`);
    });
  }

  fs.writeFileSync(`${staticPath}/version.json`, JSON.stringify(info, null, 2) + "\n");
  console.info('Version info written to static/version.json');

  // move build to target folder
  var newPath = path.join(__dirname, DIST_DIR, projectName);

  fs.rmdirSync(newPath, {recursive: true});
  fs.mkdirSync(newPath, {recursive: true});

  fs.rename(staticPath, newPath, function (err) {
    if (err) throw err;
    console.log(`Successfully renamed - AKA moved into ${newPath}`);
    fs.rmdirSync(dir, {recursive: true});

    if (projectName === 'lsf') {
      console.log("Copying chunk files to the root folder");
      // copy any lsf files that match *.chunk.js* or *.wasm to the root /static/js folder so that
      // webworkers and wasm implementations can be loaded
      const jsDir = path.join(newPath, 'js');
      const pathToStatic = path.join(__dirname, '..', 'core', 'static', 'js');

      fs.readdirSync(jsDir).forEach(file => {
        if (file.match(/^.*\.(chunk\.js|chunk\.js\.map|wasm)$/)) {
          console.log(`Copying ${file} to ${pathToStatic}`);

          fs.copyFileSync(path.join(jsDir, file), path.join(pathToStatic, file));
        }
      });
    }

    console.log(`Cleaned up tmp directory [${dir}]`);
  });
}

// repo name and branch name
get(process.argv[2], process.argv[3]);
