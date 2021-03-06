import Rx from 'rx'

export let keycodes = {
  8: 'backspace', 46: 'delete',
  48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
  65: 'a', 66: 'b', 67: 'c', 68: 'd', 69: 'e', 70: 'f', 71: 'g',
  72: 'h', 73: 'i', 74: 'j', 75: 'k', 76: 'l', 77: 'm', 78: 'n',
  79: 'o', 80: 'p', 81: 'q', 82: 'r', 83: 's', 84: 't', 85: 'u',
  86: 'v', 87: 'w', 88: 'x', 89: 'y', 90: 'z'
}

/*
function setKeyBidings( element ){
  //based on http://qiita.com/jdeseno/items/72e12a5fa815b52f95e2
 */

export function isValidElementEvent (event) {
  let element = event.target || event.srcElement
  return !(element.tagName === 'INPUT' || element.tagName === 'SELECT' || element.tagName === 'TEXTAREA' || element.isContentEditable)
}

export function preventBackNavigation () {
  // disable backspace navigation for MacOs
  Rx.Observable.fromEvent(document, 'keydown')
    .map(e => ({event: e, key: keycodes[e.keyCode]})).filter(e => e.key === 'backspace')
    .tap(function ({event}) {
      const d = event.srcElement || event.target
      const tagName = d.tagName.toUpperCase()
      const type = d.type ? d.type.toUpperCase() : undefined
      const validElements = ['TEXT', 'PASSWORD', 'FILE', 'SEARCH', 'EMAIL', 'NUMBER', 'DATE']

      if (!((tagName === 'INPUT' && validElements.indexOf(type) > -1) || tagName === 'TEXTAREA')) {
        event.preventDefault()
        return false
      }
    })
    .forEach(e => e)
}
