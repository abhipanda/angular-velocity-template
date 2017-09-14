'use strict';

const fs = require('fs-extra');
const Engine = require('velocity').Engine;
const cheerio = require('cheerio');

/**
 * Main function to process the conversion
 * @param path
 * @param pathData
 * @param dest
 * @param destHTML
 */
const init = ({path = '/data/test.html', pathData = '/data/test.json', dest = '/output/out.vm', destHTML = '/output/out.html', preEvalFn, postEvalFn}) => {

  fs.readFile(__dirname + path, 'utf8', function(err, contents) {
    fs.ensureFileSync(__dirname + dest);
    fs.ensureFileSync(__dirname + destHTML);
    let {replacedContent, pos} = processFile(contents);

    // Evaluate the pre evaluation function if supplied
    if (preEvalFn) {
      preEvalFn(replacedContent, pos, (processedContent) => {
        fs.writeFileSync(__dirname + dest, processedContent, 'utf8');
        evalVelocityTemplate();
      });
    } else {
      fs.writeFileSync(__dirname + dest, replacedContent, 'utf8');
      evalVelocityTemplate();
    }


    if (postEvalFn) {
      postEvalFn(replacedContent, pos, (processedContent) => {
        fs.writeFile(__dirname + dest, processedContent, 'utf8');
      });
    }

  });

  const evalVelocityTemplate = () => {

    let jsonSyned = fs.readJsonSync(__dirname + pathData);
    let engine = new Engine({template: __dirname + dest});
    let result = engine.render(jsonSyned);
    fs.writeFileSync(__dirname + destHTML, result, 'utf8');

  };


  /**
   * This function converts the angular ng-repeat with velocity template foreach
   * @param content
   * @param pos
   * @returns {XML|string|*|void}
   */
  const processForLoops = (content, pos) => {
    const $ = cheerio.load(content), htmlElement = $("html");
    let ngRepeats = htmlElement.find("*[ng-repeat]");
    for (let index = 0; index < ngRepeats.length; index++) {
      let ngIF = $(ngRepeats[index]);
      let ngRepeat = ngIF.attr('ng-repeat');
      pos.variables.push(ngRepeat.split(' ')[2]);
      ngIF.before('\n #foreach( $!' + ngRepeat.split(' ')[0] + ' in $!' + ngRepeat.split(' ')[2] + ' )\n');
      ngIF.after('\n #end \n');
      ngIF.removeAttr("ng-repeat");

    }

    return htmlElement.html().replace(/&amp;/g, '&');
  };

  /**
   * This function replaces the angular variables with velocity template variables
   * @param content
   * @param pos
   * @returns {*}
   */
  const processVariableReplacement = (content, pos) => {
    for (let index = 0; index < pos.varAngular.length; index++) {
      let toRep = pos.varAngular[index];
      let rep = pos.varVelocity[index];
      let regex = new RegExp("/" + toRep + "/", "g");
      content = content.replace(regex, rep);

    }
    return content;
  };


  /**
   * This function replaces the angular ng-if with velocity if
   * @param content
   * @returns {XML|string|*|void}
   */
  const processNgIfs = (content) => {
    const $ = cheerio.load(content), htmlElement = $("html");
    let ngIFs = htmlElement.find("*[ng-if]");
    for (let index = 0; index < ngIFs.length; index++) {
      let ngIF = $(ngIFs[index]);
      let textArray = ngIF.attr('ng-if').split(' ');
      for (let i = 0; i < textArray.length; i++) {
        let val = textArray[i];
        if (val.charAt(0) === '(' && isLetter(val.charAt(1))) {
          textArray[i] = val.replace('(', '($!');
        } else if (isLetter(val.charAt(0))) {
          textArray[i] = val.replace(val.charAt(0), '$!' + val.charAt(0));
        }
      }
      let text = textArray.join(' ');
      ngIF.before('\n #if (' + text + ')\n');
      ngIF.after('\n #end \n');
      ngIF.removeAttr("ng-if");

    }
    return htmlElement.html().replace(/&amp;/g, '&');

  };

  /**
   *
   * @param c
   * @returns {boolean}
   */
  const isLetter = (c) => {
    return c.toLowerCase() !== c.toUpperCase();
  };

  /**
   *
   * @param content
   * @returns {{replacedContent: string, pos: {}}}
   */
  const processFile = (content = '') => {

    console.log(content.length);
    const $ = cheerio.load(content), htmlElement = $("html");
    let pos = {}, replacedContent = content;
    pos.startIndex = [];
    pos.endIndex = [];
    pos.varVelocity = [];
    pos.varAngular = [];
    pos.variables = [];
    for (let cnt = 0; cnt < content.length; cnt++) {
      let lenStart = content[cnt], lenEnd;
      if (content[cnt + 1]) {
        lenEnd = content[cnt + 1];
      }
      if (lenStart + lenEnd === "{{") {
        pos.startIndex.push(cnt);
      }
      if (lenStart + lenEnd === "}}") {
        let arrayLen = pos.endIndex.length;
        pos.endIndex.push(cnt + 1);

        let varCurly = content.substr(
          pos.startIndex[arrayLen], pos.endIndex[arrayLen] - pos.startIndex[arrayLen] + 1
        ), variable = varCurly.substr(2, varCurly.length - 4), varToReplace = "$!{" + variable + "}";
        pos.varAngular.push(varCurly);
        pos.varVelocity.push(varToReplace);
        pos.variables.push(variable);
        replacedContent = replacedContent.replace(varCurly, varToReplace);

      }

    }

    console.log(pos);
    replacedContent = processForLoops(replacedContent, pos);
    replacedContent = processNgIfs(replacedContent);
    replacedContent = processVariableReplacement(replacedContent, pos);


    return {replacedContent, pos};
  };


};




module.exports = {
  init: init
};