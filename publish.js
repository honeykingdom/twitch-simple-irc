const ghpages = require('gh-pages');

const options = {
  src: ['dist/**/*', 'package.json', 'LICENSE', 'README.md'],
  branch: 'master',
};

const handleError = (error) => {
  if (error) {
    console.log(error);
  }
};

ghpages.publish('./', options, handleError);
