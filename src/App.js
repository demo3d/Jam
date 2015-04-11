import React from 'react';
import co from 'co';

import ThreeJs from './webgl/three-js.react.js';
import postProcessMesh from './meshpp/postProcessMesh'

import AssetManager from 'usco-assetmanager'
import DesktopStore from 'usco-desktop-store'
import XhrStore     from 'usco-xhr-store'
import StlParser    from 'usco-stl-parser'
import CtmParser    from 'usco-ctm-parser'
import PlyParser    from 'usco-ply-parser'
/*import AMfParser    from 'usco-amf-parser'
import ObjParser    from 'usco-obj-parser'*/
//import registerReact from 'reactive-elements';

import Kernel       from 'usco-kernel2'


import cstpTest from './coms/csp-test'
import {bufferWithTimeOrCount, fromDomEvent, MouseDrags} from './coms/interactions'

var csp = require("js-csp");
let {chan, go, take, put,putAsync, alts, timeout} = require("js-csp");
var xducers = require("transducers.js");
var seq = xducers.seq
var transduce = xducers.transduce
var reduce    = xducers.reduce

let pipeline = csp.operations.pipeline;
let merge    = csp.operations.merge;

import Rx from 'rx'
let fromEvent = Rx.Observable.fromEvent;


import {partitionMin} from './coms/utils'


import DndBehaviour           from './behaviours/dndBe'

import keymaster from 'keymaster'


import logger from './utils/log'
let log = logger("Jam-Root");
log.setLevel("info");





export default class App extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      appInfos:{
        ns:"youmagineJam",
        name:"Jam!",
        version:"0.0.0"
      },
      settings:{//TODO: each component should "register its settings"
        grid:{
          show:false,
          size:"",
        },
        bom:{
          show:false,//this belongs in the bom system
        },
         annotations:{
          show:false,
        }
      },
      shortcuts:{
        'duplicateEntity':'⌘+r,ctrl+d',
        'removeEntity':'delete',
        'toTranslateMode':'m',
        'toRotateMode':'r',
        'toScaleMode':'s'
      },
      camActive : false,//is a camera movement taking place ?
      activeTool: null,
      design:{
        title:"untitled design"
      }
    };

    this.assetManager = new AssetManager();
    this.assetManager.addParser("stl", new StlParser());
    this.assetManager.addParser("ctm", new CtmParser());
    this.assetManager.addParser("ply", new PlyParser());

    this.assetManager.addStore( "desktop", new DesktopStore() );
    this.assetManager.addStore( "xhr"    , new XhrStore() );

    this.kernel = new Kernel(this.state);
    this.kernel.setState = this.setState.bind(this);
  }
  
  componentDidMount(){
    var pjson = require('../package.json');
    this.setState(
    {
      appInfos:{
        ns : this.state.appInfos.ns,
        name: this.state.appInfos.name,
        version:pjson.version
      }  
    });

    //add drag & drop behaviour 
    let container = this.refs.wrapper.getDOMNode();
    DndBehaviour.attach( container );
    DndBehaviour.dropHandler = this.dropHandler.bind(this);

    let glview   = this.refs.glview;
    let meshesCh = glview.selectedMeshesCh;
    

    //get entities 
    let checkCount = function(x){
      return (x.length>0)
    }

    let filterEntities = function( x ){
      return (x.userData && x.userData.entity)
    }

    let fetchEntities = function( x ){
      return x.userData.entity;
    }


    let meshesCh2 = glview.selectedMeshesCh;
    let xform = xducers.compose(
      xducers.filter( checkCount )//x => x.length>0)
      //xducers.partition(2)
    );

    let xTractEntities = xducers.compose(
        xducers.keep(),
        xducers.dedupe(),
        xducers.filter( filterEntities), //(x => x.userData && x.userData.entity ),
        xducers.map( fetchEntities )//x => x.userData.entity )
    );
    //pipeline( meshesCh2, xform, meshesCh2 );

    this.selectedEntities = [];
    let self = this;

    go(function*() {
      let prevSelections = []
      while(true) {
        var result = yield meshesCh2;
        let res  = seq(result,xTractEntities )
        

        prevSelections.map(function(entity){
          entity._selected = false;
        })

        res.map(function(entity){
          entity._selected = true;
        })
        self.selectedEntities = res;

        if( res.length >0 || prevSelections.length>0){
          console.log("I got entities",res)
          self._tempForceDataUpdate();
        }  

        prevSelections = res || [];
      }
    });

    //setup key bindings
    this.setupKeyboard()
    this.setupMouseTrack()
  }

  componentWillUnmount(){
    DndBehaviour.detach( );
  }

  //event handlers
  setupKeyboard(){
    //non settable shortcuts
    //prevent backspace
    keymaster('backspace', function(){ 
      return false
    });
    keymaster('F11', function(){ 
      //self.handleFullScreen();
    });
    keymaster('⌘+z,ctrl+z', function(){ 
      //self.undo();
    });
    keymaster('⌘+shift+z,ctrl+shift+z', function(){ 
      //self.redo();
    });

    //deal with all shortcuts
    let shortcuts = this.state.shortcuts;
    for(let actionName in shortcuts){
      let keys = shortcuts[actionName]
      keymaster(keys, function(){ 
        console.log(`will do ${actionName}`)
        return false;
      });
    }

    /*
      //self.removeEntity();
      //self.duplicateEntity();
      //self.toTranslateMode();
      //self.toRotateMode();
      //self.toScaleMode();
    */
  }

  unsetKeyboard(){
    //keymaster.unbind('esc', this.onClose)
  }

  dropHandler(data){
    log.info("data was dropped into jam!", data)
    for (var i = 0, f; f = data.data[i]; i++) {
        this.loadMesh( f, {display: true} );
    }
  }
  doubleTapHandler( event ){
    var pickingInfos = event.detail.pickingInfos;
    if(!pickingInfos) return;
    if(pickingInfos.length == 0) return;
    var object = pickingInfos[0].object; 
    //console.log("object double tapped", object);
    this._zoomInOnObject.execute( object, {position:pickingInfos[0].point} );
  }

  setupMouseTrack(trackerEl, outputEl){
    let trackerEl = this.refs.wrapper.getDOMNode();

    let clickStream = fromEvent(trackerEl, 'click');
    let mouseDowns  = fromEvent(trackerEl, 'mousedown');
    let mouseUps    = fromEvent(document, 'mouseup');
    let mouseMoves  = fromEvent(trackerEl, 'mousemove');


    let clickStreamBase = clickStream
      .buffer(function() { return clickStream.throttle(250); })
      .map( list => list.length )
      .share();

    let singleClickStream = clickStreamBase.filter( x => x == 1 );
    let multiClickStream  = clickStreamBase.filter( x => x >= 2 );
    let mouseDrags = mouseDowns.select(function (downEvent) {
        return mouseMoves.takeUntil(mouseUps)
        //.select(function (drag) {
        //    return getOffset(drag);
        //});

    //SelectMany
    });
    mouseDrags.subscribe(function (drags) {
      log.info("drags")
    })
    // Listen to both streams and render the text label accordingly
    singleClickStream.subscribe(function (event) {
        log.info( 'click' );
    });
    multiClickStream.subscribe(function (numclicks) {
        log.info( numclicks+'x click');
    });
    Rx.Observable.merge(singleClickStream, multiClickStream)
        .throttle(1000)
        .subscribe(function (suggestion) {
    });

    /*var multiClickStream = clickStream
        .buffer(function() { return clickStream.throttle(250); })
        .map(function(list) { return list.length; })
        .filter(function(x) { return x >= 2; });

    // Same as above, but detects single clicks
    var singleClickStream = clickStream
        .buffer(function() { return clickStream.throttle(250); })
        .map(function(list) { return list.length; })
        .filter(function(x) { return x === 1; });

    // Listen to both streams and render the text label accordingly
    singleClickStream.subscribe(function (event) {
        document.querySelector('h2').textContent = 'click';
    });
    multiClickStream.subscribe(function (numclicks) {
        document.querySelector('h2').textContent = ''+numclicks+'x click';
    });
    Rx.Observable.merge(singleClickStream, multiClickStream)
        .throttle(1000)
        .subscribe(function (suggestion) {
            document.querySelector('h2').textContent = '';
    });*/

    /*let trackerEl = this.refs.wrapper.getDOMNode();
    let outputEl  = this.refs.infoLayer.getDOMNode();

    let isTwoValues  = function( x ) { return (x.length == 2); }
    let isOneValue = function( x ) { return (x.length == 1); }

    let mouseUps    = fromDomEvent(trackerEl, 'mouseup');
    let mouseDowns  = fromDomEvent(trackerEl, 'mousedown');
    let mouseMoves  = fromDomEvent(trackerEl, 'mousemove');*/

    //mouseDowns = csp.operations.map( inc, mouseDowns, 1);
    /*pipeline(mouseUps,   xducers.map( x => false ), mouseUps);
    pipeline(mouseDowns, xducers.map( x => true ) , mouseDowns);

    let mouseStates = merge([mouseDowns,mouseUps]);
    let pointerHold = bufferWithTimeOrCount(mouseStates,600,2)
    pipeline( pointerHold, xducers.filter( x => (x===true) ), pointerHold );*/

  }

  //FIXME: move this into assetManager
  dismissResource(resource){
    resource.deferred.reject("cancelling");
    this.assetManager.unLoad( resource.uri )
  }

  loadMesh( uriOrData, options ){
    const DEFAULTS={
    }
    var options     = options || {};
    var display     = options.display === undefined ? true: options.display;
    var addToAssembly= options.addToAssembly === undefined ? true: options.addToAssembly;
    var keepRawData = options.keepRawData === undefined ? true: options.keepRawData;
    
    if(!uriOrData) throw new Error("no uri or data to load!");

    let self = this;
    let resource = this.assetManager.load( uriOrData, {keepRawData:true, parsing:{useWorker:true,useBuffers:true} } );

    var source = Rx.Observable.fromPromise(resource.deferred.promise);

    let logNext  = function( next ){
      log.info( next )
    }
    let logError = function( err){
      log.error(err)
    }
    let handleLoadError = function( err ){
       log.error("failed to load resource", err, resource.error);
       //do not keep error message on screen for too long, remove it after a while
       setTimeout(cleanupResource, self.dismissalTimeOnError);
       return resource;
    }
    let cleanupResource = function( resource ){
      log.info("lkjlk")
      self.dismissResource(resource);
    }

    let register = function( shape ){
      //part type registration etc
      //we are registering a yet-uknown Part's type, getting back an instance of that type
      let partKlass = self.kernel.registerPartType( null, null, shape, {name:resource.name, resource:resource} );
      if( addToAssembly ) {
        let part = self.kernel.makePartTypeInstance( partKlass );
        self.kernel.registerPartInstance( part );
      }

      return shape;
    }

    let showIt = function( shape ){
      if( display || addToAssembly ){
        self._meshInjectPostProcess( shape );
        shape.userData.entity._selected = true;
        self._tempForceDataUpdate();
      }
    }

    let mainProc = source
      .map( postProcessMesh )
      .share();

    /*mainProc.map( register ).subscribe(logNext,logError);
    mainProc.map( showIt ).subscribe(logNext,logError);*/
    mainProc
      .map( register )
      .map( showIt )
        .catch(handleLoadError)
        //.timeout(100,cleanupResource)
        .subscribe(logNext,logError);

    mainProc.subscribe(logNext,logError);
  }

  //mesh insertion post process
  //FIXME: do this better , but where ?
  _meshInjectPostProcess( mesh ){
    //FIXME: not sure about these, they are used for selection levels
    mesh.selectable      = true;
    mesh.selectTrickleUp = false;
    mesh.transformable   = true;
    //FIXME: not sure, these are very specific for visuals
    mesh.castShadow      = true;
    //mesh.receiveShadow = true;
    //FIXME: not sure where this should be best: used to dispatch "scene insertion"/creation operation
    //var operation = new MeshAddition( mesh );
    //self.historyManager.addCommand( operation );
  }

  handleClick(){
    //console.log( this.state )
  }

  _tempForceDataUpdate(){
    let glview   = this.refs.glview;
    let assembly = this.kernel.activeAssembly;
    let entries  = assembly.children;

    let mapper = function( entity, addTo, xform ){
      let self = this;
      co(function* (){
        let meshInstance = yield self.kernel.getPartMeshInstance( entity ) ;
        console.log("meshInstance",meshInstance)
        if( meshInstance){
          meshInstance.userData.entity = entity;//FIXME : should we have this sort of backlink ?
          //FIXME/ make a list of all operations needed to be applied on part meshes
          //computeObject3DBoundingSphere( meshInstance, true );
          //centerMesh( meshInstance ); //FIXME do not use the "global" centerMesh
          
          meshInstance.position.fromArray( entity.pos )
          meshInstance.rotation.fromArray( entity.rot );
          meshInstance.scale.fromArray(  entity.sca );
          
          if (addTo)addTo.add( meshInstance);
          if (xform) xform(entity,meshInstance);
          self._meshInjectPostProcess( meshInstance );

          return meshInstance;
          //self._meshInjectPostProcess( meshInstance );
        }
      });
    };

    glview.forceUpdate(entries, mapper.bind(this));
  }

  selectedMeshesChangedHandler( selectedMeshes ){
    //console.log("selectedMeshes",selectedMeshes)
    let kernel = this.kernel;
    let selectedEntities = selectedMeshes.map( mesh => {
        return kernel.getEntityOfMesh( mesh )
      }
    );
    //console.log("selectedEntities",selectedEntities)
  }
  
  render() {
    let infoLayerStyle = {
      color: 'red',
      width:'300px',
      height:'300px',
      zIndex:15,
      position: 'absolute',
      left: 0,
      top: 0,
    };

    let titleStyle = {
      position: 'absolute',
      left: '50%',
      top: 0,
    }
    let testAreaStyle = {
      position: 'absolute',
      left: 0,
      bottom: 0,
    };

    let fullTitle = `${this.state.design.title} ---- ${this.state.appInfos.name} v  ${this.state.appInfos.version}`;

    return (
        <div ref="wrapper">
          <div ref="title" style={titleStyle} > {fullTitle} </div>
          <ThreeJs testProp={this.state.test} cubeRot={this.state.cube} ref="glview"
          />
          <div ref="infoLayer" style={infoLayerStyle} />
          <div ref="testArea" style={testAreaStyle}>
            <button onClick={this.handleClick.bind(this)}> Test </button>
          </div>
        </div>
    );
  }
}
