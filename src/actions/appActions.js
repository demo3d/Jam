import {createAction} from '../utils/obsUtils'

/*show context menu*/
export let showContextMenu = createAction();

/*hide context menu
*/
export let hideContextMenu = createAction();

/*ermm... undo ?*/
export let undo = createAction();

/*ermm... redo ?*/
export let redo = createAction();