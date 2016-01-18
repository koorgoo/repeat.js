BABEL=./node_modules/babel-cli/bin/babel.js
MOCHA=./node_modules/mocha/bin/mocha
UGLIFYJS=./node_modules/uglify-js/bin/uglifyjs

build:
	@${BABEL} lib/repeat.js --out-file build/repeat.js

test:
	@make build
	@${MOCHA} --harmony --harmony_destructuring

dist:
	@make build && \
		cat dist/start.js > dist/repeat.js && \
		cat build/repeat.js | sed -e '1d' >> dist/repeat.js && \
		cat dist/end.js >> dist/repeat.js
	@cat dist/repeat.js | ${UGLIFYJS} - --output dist/repeat.js

.PHONY: build test dist
