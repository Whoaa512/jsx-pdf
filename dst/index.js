'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _flattenDeep = require('lodash/flattenDeep');

var _flattenDeep2 = _interopRequireDefault(_flattenDeep);

var _isNil = require('lodash/isNil');

var _isNil2 = _interopRequireDefault(_isNil);

var _last = require('lodash/last');

var _last2 = _interopRequireDefault(_last);

var _omit = require('lodash/omit');

var _omit2 = _interopRequireDefault(_omit);

var _pick = require('lodash/pick');

var _pick2 = _interopRequireDefault(_pick);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const isTextElement = tag => typeof tag === 'string' || typeof tag === 'number'; /*
                                                                                  * Copyright 2018 Schibsted.
                                                                                  * Licensed under the MIT license. See LICENSE file in the project root for details.
                                                                                  */

// libs

const isTopLevelElement = elementName => ['header', 'content', 'footer'].includes(elementName);

function updateContext(context, overrides) {
  return Object.assign(context, overrides);
}

function createContext(parentContext = {}) {
  return Object.assign({}, parentContext);
}

function createElement(elementName, attributes, ...children) {
  const flatChildren = (0, _flattenDeep2.default)(children);
  return {
    elementName,
    children: flatChildren,
    attributes: attributes || {}
  };
}

function resolve(tag, context) {
  let resolvedTag = tag;
  while (resolvedTag && typeof resolvedTag.elementName === 'function') {
    resolvedTag = resolvedTag.elementName(Object.assign({}, resolvedTag.attributes, { children: resolvedTag.children }), context, updateContext.bind(null, context));
  }

  return resolvedTag;
}

function unwrapTextElements(elements) {
  if (elements.length === 1 && isTextElement(elements[0])) {
    return elements[0];
  }

  return elements;
}

function resolveChildren(tag, parentContext, isTopLevel) {
  const resolvedTag = resolve(tag, parentContext);

  if (!resolvedTag) {
    return null;
  }

  if (isTextElement(resolvedTag)) {
    return resolvedTag;
  }

  const elementName = resolvedTag.elementName;
  var _resolvedTag$children = resolvedTag.children;
  const children = _resolvedTag$children === undefined ? [] : _resolvedTag$children,
        attributes = resolvedTag.attributes;


  if (!isTopLevel && isTopLevelElement(elementName)) {
    throw new Error('<header>, <content> and <footer> elements can only appear as immediate descendents of the <document>');
  }

  if (isTopLevel && !isTopLevelElement(elementName)) {
    throw new Error(`The <document> element can only contain <header>, <content>, and <footer> elements but found ${elementName}`);
  }

  if (['header', 'footer'].includes(elementName) && children.length === 1 && typeof children[0] === 'function') {
    return (...args) => Object.assign({
      stack: [resolveChildren(children[0](...args), createContext(parentContext))]
    }, attributes);
  }

  const resolvedChildren = children.reduce((acc, child) => {
    const resolvedChild = resolveChildren(child, createContext(parentContext));

    if (isTextElement((0, _last2.default)(acc)) && isTextElement(resolvedChild)) {
      // If the previous child is a string
      // and the next child is a string,
      // join them together.
      acc[acc.length - 1] = `${acc[acc.length - 1]}${resolvedChild}`;
    } else if (!(0, _isNil2.default)(resolvedChild)) {
      // Otherwise push the child onto
      // the accumulator (as long as it's
      // not null or undefined).
      acc.push(resolvedChild);
    }

    return acc;
  }, []);

  /**
   * This is the meat. If you're in this file, you're probably looking for this.
   *
   * Converts the React-like syntax to something PDFMake understands.
   */
  switch (elementName) {
    case 'header':
    case 'content':
    case 'footer':
    case 'stack':
    case 'column':
    case 'cell':
      return Object.assign({ stack: resolvedChildren }, attributes);
    case 'text':
      return Object.assign({
        text: unwrapTextElements(resolvedChildren)
      }, attributes);
    case 'columns':
      return Object.assign({ columns: resolvedChildren }, attributes);
    case 'image':
      return Object.assign({ image: attributes.src }, (0, _omit2.default)(attributes, 'src'));
    case 'table':
      return Object.assign({
        table: Object.assign({
          body: resolvedChildren
        }, (0, _pick2.default)(attributes, ['headerRows', 'widths']))
      }, (0, _omit2.default)(attributes, ['headerRows', 'widths']));
    case 'row':
      return resolvedChildren;
    case 'ul':
      return Object.assign({ ul: resolvedChildren }, attributes);
    case 'ol':
      return Object.assign({ ol: resolvedChildren }, attributes);
    case 'document':
      throw new Error('<document> can only appear as the root element');
    default:
      return null;
  }
}

/*
 * Recursively traverse the JSON component tree created by the createElement calls,
 * resolving components from the bottom up.
 */
function renderPdf(tag) {
  const context = createContext();
  const resolvedTag = resolve(tag, context);
  const children = resolvedTag.children,
        elementName = resolvedTag.elementName,
        attributes = resolvedTag.attributes;


  if (elementName !== 'document') {
    throw new Error(`The root element must resolve to a <document>, actually resolved to ${elementName}`);
  }

  const result = {};
  const isTopLevel = true;

  children.forEach(child => {
    const resolvedChild = resolve(child, context);
    result[resolvedChild.elementName] = resolveChildren(resolvedChild, context, isTopLevel);
  });

  return Object.assign({}, result, attributes);
}

exports.default = {
  createElement,
  renderPdf
};