if (typeof require !== 'undefined') {
  var expect = require('expect.js');
  var Get = require('../lib/get');
  var MessageFormat = require('../');
}

describe('Get', () => {
  let msgData, messages;

  before(() => {
    const mf = new MessageFormat(['en', 'fi']);
    const msgSet = {
      en: {
        a: 'A {TYPE} example.',
        b: 'This has {COUNT, plural, one{one user} other{# users}}.',
        c: {
          d: 'We have {P, number, percent} code coverage.'
        }
      },
      fi: {
        b: 'Tällä on {COUNT, plural, one{yksi käyttäjä} other{# käyttäjää}}.',
        e: 'Minä puhun vain suomea.'
      }
    };
    msgData = mf.compile(msgSet);
  })

  beforeEach(() => {
    messages = new Get(msgData, 'en');
  })

  it('constructor', () => {
    expect(messages).to.be.a(Get);
    expect(messages.locale).to.eql('en');
    expect(messages.defaultLocale).to.eql('en');
    expect(messages.availableLocales).to.eql(['en', 'fi']);
    messages = new Get(msgData);
    expect(messages.locale).to.eql('en');
    messages = new Get(msgData, 'fi');
    expect(messages.locale).to.eql('fi');
    messages = new Get(msgData, null);
    expect(messages.locale).to.eql(null);
  });

  it('hasMessage', () => {
    expect(messages.hasMessage('a')).to.be(true);
    expect(messages.hasMessage('c')).to.be(false);
    messages.locale = 'fi';
    expect(messages.hasMessage('a')).to.be(false);
    expect(messages.hasMessage('a', 'en')).to.be(true);
    expect(messages.hasMessage('a', null, true)).to.be(true);
  });

  it('hasObject', () => {
    expect(messages.hasObject('a')).to.be(false);
    expect(messages.hasObject('c')).to.be(true);
    messages.locale = 'fi';
    expect(messages.hasObject('c')).to.be(false);
    expect(messages.hasObject('c', 'en')).to.be(true);
    expect(messages.hasObject('c', null, true)).to.be(true);
  });

  it('get/set fallback', () => {
    expect(messages.getFallback()).to.eql([]);
    expect(messages.getFallback('fi')).to.eql(['en']);
    messages.setFallback('en', ['foo', 'fi']);
    expect(messages.getFallback()).to.eql(['foo', 'fi']);
    messages.locale = 'fi';
    expect(messages.getFallback()).to.eql(['en']);
    messages.setFallback('fi', []);
    expect(messages.getFallback()).to.eql([]);
    messages.setFallback('fi', null);
    expect(messages.getFallback()).to.eql(['en']);
    messages.defaultLocale = null;
    expect(messages.getFallback()).to.eql([]);
  });

  it('get message', () => {
    expect(messages.get('b', { COUNT: 3 })).to.eql('This has 3 users.');
    expect(messages.get(['c', 'd'], { P: 0.314 })).to.eql('We have 31% code coverage.');
    expect(messages.get('e')).to.eql('e');
    messages.setFallback('en', ['foo', 'fi']);
    expect(messages.get('e')).to.eql('Minä puhun vain suomea.');
    messages.locale = 'fi';
    expect(messages.get('b', { COUNT: 3 })).to.eql('Tällä on 3 käyttäjää.');
  });

  it('get object', () => {
    expect(messages.get('c')).to.have.property('d')
    messages.locale = 'fi';
    expect(messages.get('c')).to.have.property('d')
    expect(messages.get('c').d({ P: 0.628 })).to.eql('We have 63% code coverage.');
    expect(messages.get([])).to.only.have.keys(['b', 'e']);
  });

  it('addLocale', () => {
    const mf = new MessageFormat('sv');
    const sv = { e: 'Jag pratar lite svenska.' }
    messages.addLocale('sv', mf.compile(sv));
    expect(messages.availableLocales).to.eql(['en', 'fi', 'sv']);
    messages.locale = 'sv'
    expect(messages.get('e')).to.eql('Jag pratar lite svenska.');
    expect(messages.getFallback()).to.eql(['en']);
    expect(messages.get([])).to.only.have.key('e');
  });
});
