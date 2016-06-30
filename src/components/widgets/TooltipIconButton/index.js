/** @jsx hJSX */
import { hJSX } from '@cycle/dom'
import Class from 'classnames'
import assign from 'fast.js/object/assign'//faster object.assign

function getToolTip (tooltip, toggleCondition) {
  if (!toggleCondition) {
    return {'data-tooltip': tooltip}
  } else {
    return undefined
  }
}

export default function tooltipIconBtn (options){
  /*toggleCondition, icon, mainClass, tooltip,
  tooltipPos = 'bottom', disabledCondition = false, popOverContent = undefined, arrow=true, subItems=false, position='right', size='large') {
  */
  const defaults = {
    toggled: false,
    disabledCondition: false,

    icon: '',
    klass: '',
    arrow: true,
    position: 'right',
    size: 'large',
    subItems: false,

    tooltip: '',
    tooltipPos: 'bottom',

    content: undefined
  }
  const {toggled, disabledCondition, icon, klass, arrow, position, size, subItems, tooltip, tooltipPos, content} = assign({}, defaults, options)

  const subItemsIndicator = subItems ? <span className='subItemsIndicator'/> : ''
  // arrow related
  const borderNotch = arrow ? <b className='border-notch notch'></b> : ''
  const notch = arrow ? <b className='notch'></b> : ''

  const button = <button
      disabled={disabledCondition}
      className={Class(klass, `tooltip-${tooltipPos}`, {active: toggled})}
      attributes={getToolTip(tooltip, toggled)}>
      <span innerHTML={icon}/>
      {subItemsIndicator}
    </button>

  let innerContent
  if (content !== undefined && toggled) {
    innerContent = <div
      className={Class('popOver', `popOver-${position} ${size}`, {active: toggled, arrowOffset: arrow})}>
        {content}
        {borderNotch}
        {notch}
    </div>
  }

  return <span className='toolTipButtonContainer'>
    {button}
    {innerContent}
  </span>
}
