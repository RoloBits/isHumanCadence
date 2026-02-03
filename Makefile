.PHONY: demo install-demo build test

demo: install-demo
	cd examples/react && npx vite

install-demo:
	cd examples/react && npm install

build:
	npm run build

test:
	npm test
