'use strict';

let instance;

module.exports = () => {
    return (req, res, next) => {
      return instance ? handleRequest() : compileHandler();
      
      function compileHandler() {
        req.webtaskContext.compiler.nodejsCompiler(req.webtaskContext.compiler.script, (e, Func) => {
          if (e) return next(e);
          
          instance = new Func();
          instance.secrets = req.webtaskContext.secrets;
          instance.meta = req.webtaskContext.meta;
          
          return handleRequest();
        });
      }
      
      function handleRequest() {
        let auth;
        if (req.webtaskContext.secrets.BASIC_AUTH) {
          auth = new Buffer(req.webtaskContext.secrets.BASIC_AUTH).toString('base64');
        }
        if (auth) {
          let match = (req.headers.authorization || '').match(/^\s*Basic\s+([^\s]+)\s*$/);
          if (!match || match[1] !== auth) {
            let error = new Error('Unauthorized.');
            error.statusCode = 403;
            return next(error);
          }
        }
        let method = req.body.eventType;
        if (!method) {
          let error = new Error(`Malformed CloudEvent message. The required 'eventType' property is not specified.`);
          error.statusCode = 400;
          return next(error);
        }
        if (typeof instance[method] !== 'function') {
          let error = new Error(`Unuspported eventType: ${method}.`);
          error.statusCode = 501;
          return next(error);
        }
        else {
          if (instance[method].length === 1) {
            res.writeHead(201)
            res.end(); 
          }
          return instance[method](req.body, (e,d) => {
            if (e) return next(e);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify(d));
          });
        }
      }
    };
};
