'use strict';

var assert, mockery, spooks, modulePath;

assert = require('chai').assert;
mockery = require('mockery');
spooks = require('spooks');

modulePath = '../src/options';

mockery.registerAllowable(modulePath);
mockery.registerAllowable('check-types');

suite('options:', function () {
    var log, results, mappers;

    setup(function () {
        log = {};
        results = {};
        mappers = {
            svg: {},
            odf: {}
        };

        mockery.enable({ useCleanCache: true });
        mockery.registerMock('path', spooks.obj({
            archetype: { resolve: nop },
            log: log,
            results: results
        }));
        mockery.registerMock('fs', spooks.obj({
            archetype: { existsSync: nop, statSync: nop, readFileSync: nop },
            log: log,
            results: results
        }));
        mockery.registerMock('get-off-my-log', spooks.obj({
            archetype: { initialise: nop },
            log: log,
            results: results
        }));
        mockery.registerMock('./mappers/html-svg', mappers.svg);
        mockery.registerMock('./mappers/odf-spreadsheet', mappers.odf);

        results.statSync = {
            isFile: spooks.fn({ name: 'isFile', log: log, results: results })
        };
        results.initialise = spooks.obj({
            archetype: { info: nop, warn: nop, error: nop },
            log: log,
            results: results
        });
    });

    teardown(function () {
        mockery.deregisterMock('./mappers/odf-spreadsheet');
        mockery.deregisterMock('./mappers/html-svg');
        mockery.deregisterMock('get-off-my-log');
        mockery.deregisterMock('fs');
        mockery.deregisterMock('path');
        mockery.disable();

        log = results = mappers = undefined;
    });

    test('require does not throw', function () {
        assert.doesNotThrow(function () {
            require(modulePath);
        });
    });

    test('require returns object', function () {
        assert.isObject(require(modulePath));
    });

    suite('require:', function () {
        var options;

        setup(function () {
            options = require(modulePath);
        });

        teardown(function () {
            options = undefined;
        });

        test('cli array is exported', function () {
            assert.isArray(options.cli);
            assert.lengthOf(options.cli, 14);
        });

        test('cli options seem correct', function () {
            options.cli.forEach(function (option) {
                assert.isString(option.format);
                assert.match(option.format, /^-[a-z], --[a-z]+( <[a-zA-Z]+>)?$/);
                assert.isString(option.description);
                assert.match(option.description, /^[a-z]+ [a-zA-Z0-9 ,`:\.\/-]+$/);

                if (option.coercion !== undefined) {
                    assert.isFunction(option.coercion);
                }
            });
        });

        test('normalise function is exported', function () {
            assert.isFunction(options.normalise);
        });

        suite('with JSON file config:', function () {
            setup(function () {
                results.resolve = 'wibble';
                results.existsSync = results.isFile = true;
                results.readFileSync = '{"foo":"bar","baz":"qux"}';
            });

            test('normalise throws without options', function () {
                assert.throws(function () {
                    options.normalise();
                });
            });

            test('normalise does not throw with empty options', function () {
                assert.doesNotThrow(function () {
                    options.normalise({});
                });
            });

            test('normalise throws with non-object log option', function () {
                assert.throws(function () {
                    options.normalise({ log: console.log });
                });
            });

            test('normalise throws with missing log.info function', function () {
                assert.throws(function () {
                    options.normalise({ log: { warn: nop, error: nop } });
                });
            });

            test('normalise throws with missing log.warn function', function () {
                assert.throws(function () {
                    options.normalise({ log: { info: nop, error: nop } });
                });
            });

            test('normalise throws with missing log.error function', function () {
                assert.throws(function () {
                    options.normalise({ log: { info: nop, warn: nop } });
                });
            });

            test('normalise does not throw valid log option', function () {
                assert.doesNotThrow(function () {
                    options.normalise({ log: { info: nop, warn: nop, error: nop } });
                });
            });

            suite('normalise with empty options:', function () {
                var normalised;

                setup(function () {
                    normalised = {};
                    options.normalise(normalised);
                });

                teardown(function () {
                    normalised = undefined;
                });

                test('path.resolve was called twice', function () {
                    assert.strictEqual(log.counts.resolve, 2);
                });

                test('path.resolve was called correctly first time', function () {
                    assert.strictEqual(log.these.resolve[0], require('path'));
                    assert.lengthOf(log.args.resolve[0], 1);
                    assert.strictEqual(log.args.resolve[0][0], '.wptrc');
                });

                test('path.resolve was called correctly second time', function () {
                    assert.strictEqual(log.these.resolve[0], require('path'));
                    assert.lengthOf(log.args.resolve[0], 1);
                    assert.strictEqual(log.args.resolve[1][0], 'tests.json');
                });

                test('fs.existsSync was called twice', function () {
                    assert.strictEqual(log.counts.existsSync, 2);
                });

                test('fs.existsSync was called correctly first time', function () {
                    assert.strictEqual(log.these.existsSync[0], require('fs'));
                    assert.lengthOf(log.args.existsSync[0], 1);
                    assert.strictEqual(log.args.existsSync[0][0], 'wibble');
                });

                test('fs.existsSync was called correctly second time', function () {
                    assert.strictEqual(log.these.existsSync[1], require('fs'));
                    assert.lengthOf(log.args.existsSync[1], 1);
                    assert.strictEqual(log.args.existsSync[1][0], 'wibble');
                });

                test('fs.statSync was called twice', function () {
                    assert.strictEqual(log.counts.statSync, 2);
                });

                test('fs.statSync was called correctly first time', function () {
                    assert.strictEqual(log.these.statSync[0], require('fs'));
                    assert.lengthOf(log.args.statSync[0], 1);
                    assert.strictEqual(log.args.statSync[0][0], 'wibble');
                });

                test('fs.statSync was called correctly second time', function () {
                    assert.strictEqual(log.these.statSync[1], require('fs'));
                    assert.lengthOf(log.args.statSync[1], 1);
                    assert.strictEqual(log.args.statSync[1][0], 'wibble');
                });

                test('stat.isFile was called twice', function () {
                    assert.strictEqual(log.counts.isFile, 2);
                });

                test('stat.isFile was called correctly first time', function () {
                    assert.strictEqual(log.these.isFile[0], results.statSync);
                    assert.lengthOf(log.args.isFile[0], 0);
                });

                test('stat.isFile was called correctly second time', function () {
                    assert.strictEqual(log.these.isFile[1], results.statSync);
                    assert.lengthOf(log.args.isFile[1], 0);
                });

                test('fs.readFileSync was called twice', function () {
                    assert.strictEqual(log.counts.readFileSync, 2);
                });

                test('fs.readFileSync was called correctly first time', function () {
                    assert.strictEqual(log.these.readFileSync[0], require('fs'));
                    assert.lengthOf(log.args.readFileSync[0], 1);
                    assert.strictEqual(log.args.readFileSync[0][0], 'wibble');
                });

                test('fs.readFileSync was called correctly second time', function () {
                    assert.strictEqual(log.these.readFileSync[1], require('fs'));
                    assert.lengthOf(log.args.readFileSync[1], 1);
                    assert.strictEqual(log.args.readFileSync[1][0], 'wibble');
                });

                test('get-off-my-log.initialise was called once', function () {
                    assert.strictEqual(log.counts.initialise, 1);
                });

                test('get-off-my-log.initialise was called correctly', function () {
                    assert.strictEqual(log.these.initialise[0], require('get-off-my-log'));
                    assert.lengthOf(log.args.initialise[0], 2);
                    assert.strictEqual(log.args.initialise[0][0], 'webpagetest-mapper');
                    assert.strictEqual(log.args.initialise[0][1], console.log);
                });

                test('normalised object has correct number of keys', function () {
                    assert.lengthOf(Object.keys(normalised), 10);
                });

                test('normalised.foo is correct', function () {
                    assert.strictEqual(normalised.foo, 'bar');
                });

                test('normalised.baz is correct', function () {
                    assert.strictEqual(normalised.baz, 'qux');
                });

                test('normalised.uri is correct', function () {
                    assert.strictEqual(normalised.uri, 'www.webpagetest.org');
                });

                test('normalised.location is correct', function () {
                    assert.strictEqual(normalised.location, 'Dulles:Chrome');
                });

                test('normalised.connection is correct', function () {
                    assert.strictEqual(normalised.connection, 'Native Connection');
                });

                test('normalised.tests is correct', function () {
                    assert.isObject(normalised.tests);
                    assert.lengthOf(Object.keys(normalised.tests), 2);
                    assert.strictEqual(normalised.tests.foo, 'bar');
                    assert.strictEqual(normalised.tests.baz, 'qux');
                });

                test('normalised.count is correct', function () {
                    assert.strictEqual(normalised.count, 9);
                });

                test('normalised.mapper is correct', function () {
                    assert.strictEqual(normalised.mapper, mappers.svg);
                });

                test('normalised.silent is correct', function () {
                    assert.isUndefined(normalised.silent);
                });

                test('normalised.syslog is undefined', function () {
                    assert.isUndefined(normalised.syslog);
                });

                test('normalised.log is correct', function () {
                    assert.isObject(normalised.log);
                    assert.lengthOf(Object.keys(normalised.log), 3);
                    assert.isFunction(normalised.log.info);
                    assert.isFunction(normalised.log.warn);
                    assert.isFunction(normalised.log.error);
                });

                test('normalised.config is undefined', function () {
                    assert.isUndefined(normalised.config);
                });

                test('normalised.normalised is true', function () {
                    assert.isTrue(normalised.normalised);
                });

                suite('normalise:', function () {
                    setup(function () {
                        options.normalise(normalised);
                    });

                    test('path.resolve was not called', function () {
                        assert.strictEqual(log.counts.resolve, 2);
                    });

                    test('fs.existsSync was not called', function () {
                        assert.strictEqual(log.counts.existsSync, 2);
                    });

                    test('fs.statSync was not called', function () {
                        assert.strictEqual(log.counts.statSync, 2);
                    });

                    test('stat.isFile was not called', function () {
                        assert.strictEqual(log.counts.isFile, 2);
                    });

                    test('fs.readFileSync was not called', function () {
                        assert.strictEqual(log.counts.readFileSync, 2);
                    });

                    test('get-off-my-log.initialise was not called', function () {
                        assert.strictEqual(log.counts.initialise, 1);
                    });

                    test('normalised object has correct number of keys', function () {
                        assert.lengthOf(Object.keys(normalised), 10);
                    });

                    test('normalised.foo is correct', function () {
                        assert.strictEqual(normalised.foo, 'bar');
                    });

                    test('normalised.baz is correct', function () {
                        assert.strictEqual(normalised.baz, 'qux');
                    });

                    test('normalised.uri is correct', function () {
                        assert.strictEqual(normalised.uri, 'www.webpagetest.org');
                    });

                    test('normalised.location is correct', function () {
                        assert.strictEqual(normalised.location, 'Dulles:Chrome');
                    });

                    test('normalised.connection is correct', function () {
                        assert.strictEqual(normalised.connection, 'Native Connection');
                    });

                    test('normalised.tests is correct', function () {
                        assert.isObject(normalised.tests);
                        assert.lengthOf(Object.keys(normalised.tests), 2);
                        assert.strictEqual(normalised.tests.foo, 'bar');
                        assert.strictEqual(normalised.tests.baz, 'qux');
                    });

                    test('normalised.count is correct', function () {
                        assert.strictEqual(normalised.count, 9);
                    });

                    test('normalised.mapper is correct', function () {
                        assert.strictEqual(normalised.mapper, mappers.svg);
                    });

                    test('normalised.silent is correct', function () {
                        assert.isUndefined(normalised.silent);
                    });

                    test('normalised.syslog is undefined', function () {
                        assert.isUndefined(normalised.syslog);
                    });

                    test('normalised.log is correct', function () {
                        assert.isObject(normalised.log);
                    });

                    test('normalised.config is undefined', function () {
                        assert.isUndefined(normalised.config);
                    });

                    test('normalised.normalised is true', function () {
                        assert.isTrue(normalised.normalised);
                    });
                });
            });

            suite('normalise with options:', function () {
                var normalised;

                setup(function () {
                    normalised = {
                        uri: 'foo',
                        location: 'bar',
                        connection: 'baz',
                        tests: 'qux',
                        count: 'wibble',
                        mapper: 'odf-spreadsheet',
                        silent: true,
                        log: nop,
                        foo: '',
                        something: 'else'
                    };
                    options.normalise(normalised);
                });

                teardown(function () {
                    normalised = undefined;
                });

                test('path.resolve was called twice', function () {
                    assert.strictEqual(log.counts.resolve, 2);
                });

                test('path.resolve was called correctly first time', function () {
                    assert.strictEqual(log.args.resolve[0][0], '.wptrc');
                });

                test('path.resolve was called correctly second time', function () {
                    assert.strictEqual(log.args.resolve[1][0], 'qux');
                });

                test('fs.existsSync was called twice', function () {
                    assert.strictEqual(log.counts.existsSync, 2);
                });

                test('fs.statSync was called twice', function () {
                    assert.strictEqual(log.counts.statSync, 2);
                });

                test('stat.isFile was called twice', function () {
                    assert.strictEqual(log.counts.isFile, 2);
                });

                test('fs.readFileSync was called twice', function () {
                    assert.strictEqual(log.counts.readFileSync, 2);
                });

                test('get-off-my-log.initialise was not called', function () {
                    assert.strictEqual(log.counts.initialise, 0);
                });

                test('normalised object has correct number of keys', function () {
                    assert.lengthOf(Object.keys(normalised), 12);
                });

                test('normalised.foo is correct', function () {
                    assert.strictEqual(normalised.foo, '');
                });

                test('normalised.baz is correct', function () {
                    assert.strictEqual(normalised.baz, 'qux');
                });

                test('normalised.uri is correct', function () {
                    assert.strictEqual(normalised.uri, 'foo');
                });

                test('normalised.location is correct', function () {
                    assert.strictEqual(normalised.location, 'bar');
                });

                test('normalised.connection is correct', function () {
                    assert.strictEqual(normalised.connection, 'baz');
                });

                test('normalised.tests is correct', function () {
                    assert.isObject(normalised.tests);
                    assert.lengthOf(Object.keys(normalised.tests), 2);
                    assert.strictEqual(normalised.tests.foo, 'bar');
                    assert.strictEqual(normalised.tests.baz, 'qux');
                });

                test('normalised.count is correct', function () {
                    assert.strictEqual(normalised.count, 'wibble');
                });

                test('normalised.mapper is correct', function () {
                    assert.strictEqual(normalised.mapper, mappers.odf);
                });

                test('normalised.silent is correct', function () {
                    assert.isTrue(normalised.silent);
                });

                test('normalised.syslog is undefined', function () {
                    assert.isUndefined(normalised.syslog);
                });

                test('normalised.log is correct', function () {
                    assert.isObject(normalised.log);
                    assert.lengthOf(Object.keys(normalised.log), 3);
                    assert.isFunction(normalised.log.info);
                    assert.isFunction(normalised.log.warn);
                    assert.isFunction(normalised.log.error);
                });

                test('normalised.something is correct', function () {
                    assert.strictEqual(normalised.something, 'else');
                });

                test('normalised.normalised is true', function () {
                    assert.isTrue(normalised.normalised);
                });
            });

            suite('normalise with config:', function () {
                var normalised;

                setup(function () {
                    normalised = { config: 'mahumba' };
                    options.normalise(normalised);
                });

                teardown(function () {
                    normalised = undefined;
                });

                test('path.resolve was called twice', function () {
                    assert.strictEqual(log.counts.resolve, 2);
                });

                test('path.resolve was called correctly first time', function () {
                    assert.strictEqual(log.args.resolve[0][0], 'mahumba');
                });

                test('path.resolve was called correctly second time', function () {
                    assert.strictEqual(log.args.resolve[1][0], 'tests.json');
                });

                test('fs.existsSync was called twice', function () {
                    assert.strictEqual(log.counts.existsSync, 2);
                });

                test('fs.statSync was called twice', function () {
                    assert.strictEqual(log.counts.statSync, 2);
                });

                test('stat.isFile was called twice', function () {
                    assert.strictEqual(log.counts.isFile, 2);
                });

                test('fs.readFileSync was called twice', function () {
                    assert.strictEqual(log.counts.readFileSync, 2);
                });

                test('get-off-my-log.initialise was called once', function () {
                    assert.strictEqual(log.counts.initialise, 1);
                });

                test('normalised object has correct number of keys', function () {
                    assert.lengthOf(Object.keys(normalised), 11);
                });

                test('normalised.config is correct', function () {
                    assert.strictEqual(normalised.config, 'mahumba');
                });

                test('normalised.normalised is true', function () {
                    assert.isTrue(normalised.normalised);
                });
            });
        });

        suite('with non-existent config:', function () {
            setup(function () {
                results.resolve = 'the quick brown fox jumps over the lazy dog';
                results.existsSync = false;
                results.isFile = true;
                results.readFileSync = '{"a":"b"}';
            });

            suite('normalise with empty options:', function () {
                var normalised;

                setup(function () {
                    normalised = {};
                    options.normalise(normalised);
                });

                teardown(function () {
                    normalised = undefined;
                });

                test('path.resolve was called twice', function () {
                    assert.strictEqual(log.counts.resolve, 2);
                });

                test('fs.existsSync was called twice', function () {
                    assert.strictEqual(log.counts.existsSync, 2);
                });

                test('fs.existsSync was called correctly first time', function () {
                    assert.strictEqual(log.args.existsSync[0][0], 'the quick brown fox jumps over the lazy dog');
                });

                test('fs.existsSync was called correctly second time', function () {
                    assert.strictEqual(log.args.existsSync[1][0], 'the quick brown fox jumps over the lazy dog');
                });

                test('fs.statSync was not called', function () {
                    assert.strictEqual(log.counts.statSync, 0);
                });

                test('stat.isFile was not called', function () {
                    assert.strictEqual(log.counts.isFile, 0);
                });

                test('fs.readFileSync was not called', function () {
                    assert.strictEqual(log.counts.readFileSync, 0);
                });

                test('get-off-my-log.initialise was called once', function () {
                    assert.strictEqual(log.counts.initialise, 1);
                });

                test('normalised object has correct number of keys', function () {
                    assert.lengthOf(Object.keys(normalised), 8);
                });

                test('normalised.uri is correct', function () {
                    assert.strictEqual(normalised.uri, 'www.webpagetest.org');
                });

                test('normalised.location is correct', function () {
                    assert.strictEqual(normalised.location, 'Dulles:Chrome');
                });

                test('normalised.connection is correct', function () {
                    assert.strictEqual(normalised.connection, 'Native Connection');
                });

                test('normalised.tests is correct', function () {
                    assert.isObject(normalised.tests);
                    assert.lengthOf(Object.keys(normalised.tests), 0);
                });

                test('normalised.count is correct', function () {
                    assert.strictEqual(normalised.count, 9);
                });

                test('normalised.mapper is correct', function () {
                    assert.strictEqual(normalised.mapper, mappers.svg);
                });

                test('normalised.silent is correct', function () {
                    assert.isUndefined(normalised.silent);
                });

                test('normalised.syslog is undefined', function () {
                    assert.isUndefined(normalised.syslog);
                });

                test('normalised.log is correct', function () {
                    assert.isObject(normalised.log);
                    assert.lengthOf(Object.keys(normalised.log), 3);
                    assert.isFunction(normalised.log.info);
                    assert.isFunction(normalised.log.warn);
                    assert.isFunction(normalised.log.error);
                });

                test('normalised.normalised is true', function () {
                    assert.isTrue(normalised.normalised);
                });
            });
        });

        suite('with non-JSON config:', function () {
            var normalised;

            setup(function () {
                results.resolve = 'wibble';
                results.existsSync = results.isFile = true;
                results.readFileSync = 'foo';
                normalised = {};
            });

            teardown(function () {
                normalised = undefined;
            });

            test('normalise fails with empty options', function () {
                assert.throws(function () {
                    options.normalise(normalised);
                });
                assert.isUndefined(normalised.normalised);
            });
        });
    });

    function nop () {};
});
