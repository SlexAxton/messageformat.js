# 
# Copyright 2012-2014 Alex Sexton, Eemeli Aro, and Contributors
# 
# Licensed under the MIT License
# 

.PHONY: test
GREEN=\033[32;01m
RED=\033[31;01m
YELLOW=\033[33;01m
STOP=\033[0m
CHK=${GREEN} ✓${STOP}
ERR=${RED} ✖${STOP}

dist:
	@./node_modules/.bin/webpack -p --output-library MessageFormat --output-library-target umd messageformat.js dist/messageformat.min.js

doc: ./lib/messageformat.dev.js
	@./node_modules/.bin/jsdoc -c jsdoc-conf.json

test:
	@bin/messageformat.js --module --locale en --include example/en/colors.json -o test/common-js-generated-test-fixture.js
	@mocha --reporter spec --growl test/tests.js

test-browser:
	@bin/messageformat.js --module --locale en --include example/en/colors.json -o test/common-js-generated-test-fixture.js
	@./node_modules/.bin/webpack -d -w test/tests.js test/tests-bundle.js &
	@./node_modules/.bin/serve test
	@open "http://127.0.0.1:3000/"

./lib/message_parser.js: ./lib/message_parser.pegjs
	@./node_modules/.bin/pegjs $< $@
	@echo "${CHK} parser re-compiled by pegjs"

parser: ./lib/message_parser.js

publish: ./lib/message_parser.js ./lib/messageformat.dev.js
	@sed \
		-e '1i\    // This is generated and pulled in for browsers.' \
		-e 's/module.exports/var mparser/' \
		-e 's/^/    /' \
		$< > ./parser.tmp.js
	@sed \
		-e "/var mparser = require/{r ./parser.tmp.js" \
		-e "d}" \
		$(word 2,$^) > messageformat.js
	@rm ./parser.tmp.js
	@echo "${CHK} messageformat.js ready for browsers"
