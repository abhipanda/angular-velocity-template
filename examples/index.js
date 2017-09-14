const Angular2Velocity = require('../index.js');

Angular2Velocity.init({

  postEvalFn: (content, pos, continueFn) => {
    /**
     * Method to extract variables from content
     * @param content
     * @param pos
     * @returns {*}
     */
    const postProcessTemplate = (content, pos) => {
      for (let index = 0; index < pos.variables.length; index++) {
        let toRep = pos.variables[index];
        if (toRep.indexOf('.') === -1) {
          content = '\n #set($' + toRep + '=$request.getRootElement().getChild("EVENTPAYLOAD").getChild("' + toRep + '").getValue()) ' + content;
        }
      }
      return content;
    };

    continueFn(postProcessTemplate(content, pos));
  }
});