const { exec } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

const AbstractArgument = require('./prototype');

/**
 * Mange arguments for app command.
 * */
class AppManageProto extends AbstractArgument {
  name = 'app';

  help = 'manages an application.';

  configFile = 'dragonScript.json';

  constructor(parser) {
    super(parser);
  }

  /**
   * Manage and parse arguments.
   * */
  argParser() {
    this.parser.add_argument(this.name, { help: this.help });
    const claspGruop = this.parser.add_mutually_exclusive_group();
    // Add new module.
    claspGruop.add_argument('-am', '--add-module', {
      action: 'append',
      choices: this.dsModules,
      help: 'add module',
    });
    // Remove module
    claspGruop.add_argument('-rm', '--rm-module', {
      action: 'append',
      choices: this.dsModules,
      help: 'remove a module',
    });
    // Make clasp pull
    claspGruop.add_argument('-pull', {
      action: 'store_true',
      help: 'make clasp pull.',
    });
    // Make clasp push
    claspGruop.add_argument('-push', {
      action: 'store_true',
      help: 'make clasp push.',
    });
    // Make clasp push to develop app.
    claspGruop.add_argument('-push-dev', {
      action: 'store_true',
      help: 'make clasp push.',
    });
    this.argsv = this.parser.parse_args();
  }

  processor() {
    // Path to dragonScript.json
    const configFile = path.join(this.currentExecDir, this.configFile);
    const configFileData = JSON.parse(fs.readFileSync(configFile));
    const claspFile = path.join(this.currentExecDir, '.clasp.json');
    // Add new module
    if (this.argsv.add_module) {
      this.argsv.add_module.forEach((m) => {
        const moduleName = m.trim();
        fs.copySync(
          path.join(this.baseDir, this.dsModulesName, moduleName),
          path.join(this.currentExecDir, this.dsModulesName, moduleName)
        );
        configFileData.ds_modules.push(moduleName);
      });
      // Remove module
    } else if (this.argsv.rm_module) {
      this.argsv.rm_module.forEach((m) => {
        const moduleName = m.trim();
        const index = configFileData.ds_modules.indexOf(moduleName);
        configFileData.ds_modules.splice(index, 1);
        fs.removeSync(
          path.join(this.currentExecDir, this.dsModulesName, moduleName)
        );
      });
      // Makes clasp pull
    } else if (this.argsv.pull) {
      if (!configFileData.gasId) {
        console.log(
          'There is no GAS Id to pull data correctly.' +
            '\nAdd an GAS Id in dragonScript.json.'
        );
        return;
      }
      this.execCommand('clasp pull', () => {
        fs.readdirSync(this.currentExecDir)
          .filter((f) => f.substr(-3) === '.js')
          .forEach((f) =>
            fs.renameSync(
              path.join(this.currentExecDir, f),
              path.join(
                this.currentExecDir,
                configFileData.projectName.replace(' ', '_'),
                f
              )
            )
          );
      });
      // Makes clasp push
    } else if (this.argsv.push) {
      if (!configFileData.gasId) {
        console.log(
          'There is no GAS Id to push data correctly.' +
            '\nAdd an GAS Id in dragonScript.json.'
        );
        return;
      }
      this.readWriteFileAndExecCommand(
        claspFile,
        configFileData.gasId,
        'clasp push'
      );
      // Makes clasp push dev.
    } else if (this.argsv.push_dev) {
      if (!configFileData.gasIdDev) {
        console.log(
          'There is no GAS Id to push data correctly.' +
            '\nAdd an GAS Id in dragonScript.json.'
        );
        return;
      }
      this.readWriteFileAndExecCommand(
        claspFile,
        configFileData.gasIdDev,
        'clasp push'
      );
    }

    fs.writeFileSync(configFile, JSON.stringify(configFileData, null, 4));
  }

  /**
   * Reads a clasp file (.clasp) adds it a Google Apps Script ID,
   * and then execute a command (generally push or pull).
   * @param claspFile (string): .clasp path.
   * @param gasId (string): ID's GAS.
   * @param command (string): command to be executed.
   * */
  readWriteFileAndExecCommand(claspFile, gasId, command) {
    fs.readFile(claspFile)
      .then((data) => JSON.parse(data))
      .then((data) => {
        data.scriptId = gasId;
        return fs.writeFile(claspFile, JSON.stringify(data));
      })
      .then(() =>
        this.execCommand(command, () => {
          console.log(new Date().toLocaleString());
        })
      );
  }

  /**
   * Executes a command.
   * @param command (string): command to be executed.
   * @param cb (string): callback.
   * */
  execCommand(command, cb) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      console.log(`stdout: ${stdout}`);
      if (cb) cb();
    });
  }
}

/**
 * Client to AppManage Arguments.
 * */
const AppManage = (parser) => new AppManageProto(parser);

module.exports = AppManage;
