# Copyright 2012-2016 Alex Sexton, Eemeli Aro, and Contributors
# Licensed under the MIT License

GREEN=\033[32;01m
RED=\033[31;01m
YELLOW=\033[33;01m
STOP=\033[0m
CHK=${GREEN} ✓${STOP}
ERR=${RED} ✖${STOP}

BIN=./node_modules/.bin
SRC=lib/index.js lib/compiler.js lib/formatters/* lib/get.js lib/runtime.js

.PHONY: all test test-browser doc release clean

all: messageformat.min.js test example/i18n.js doc/index.html

cli/node_modules:
	cd cli && npm install && npm install --no-save ../

node_modules: ; npm install

messageformat.js: $(SRC) | node_modules
	@${BIN}/browserify $< -s MessageFormat -o $@
	@echo "${CHK} $@ is now ready for browsers."

messageformat.min.js: messageformat.js
	@$(BIN)/uglifyjs $< --compress --mangle --output $@ --source-map $@.map
	@echo "${CHK} $@ is now ready for browsers."


test: $(SRC)
	@${BIN}/mocha

test-browser: messageformat.js
	@open "http://127.0.0.1:3000/test/" & ${BIN}/serve .


doc: doc/index.html

doc/index.html: $(SRC) | node_modules
	@${BIN}/jsdoc -c doc/jsdoc-conf.json
	@git apply doc/jsdoc-fix-fonts.patch
	@rm -r doc/fonts
	@echo "${CHK} API documentation generated with jsdoc"

example/i18n.js: cli/messageformat.js $(SRC) | cli/node_modules
	./$< --locale=en,fr --namespace=i18n $(dir $@) > $@


release: clean all
	git add -f messageformat.*js* doc/*html doc/styles/ doc/scripts/ example/i18n.js
	git commit -m 'Packaging files for release'


clean:
	rm -rf messageformat.*js* doc/*.html doc/scripts/ doc/styles/
