/**
 * @class Shiitake
 * @description React line clamp that won't get you fired
 */

import React, { PropTypes } from 'react';
import ReactDOM from 'react-dom';

import ResizeCore from './ResizeCore';
import {
  wrapperStyles,
  childrenStyles,
  block,
  spreaderStyles,
  sizerWrapperStyles,
  setTag,
  passProps,
} from './constants';

class Shiitake extends ResizeCore {
  state = {
    lastCalculatedWidth: -1,
    children: '',
    testChildren: '',
  }

  static propTypes = {
    lines: PropTypes.number.isRequired,
    className: PropTypes.string,
    children: PropTypes.string.isRequired,
  }

  componentWillMount() {
    this.setState({ lastCalculatedWidth: -1 });
  }

  componentWillReceiveProps(newProps) {
    const { children } = newProps;

    // if we've got different children, reset and retest
    if (children !== this.props.children) {
      this.setState({ lastCalculatedWidth: -1, children });
      this._setTestChildren(0, children.length);
    }
  }

  _callDeffered(func) {
    setTimeout(() => {
      if (Object.keys(this.refs).length > 0) { func.bind(this)(); }
    }, 0);
  }

  _checkHeight(start, end) {
    const contentHeight = ReactDOM.findDOMNode(this.refs.testChildren).offsetHeight;
    const halfWay = end - Math.round((end - start) / 2);

    // TODO: refine this flag, make simpler
    const linear = (end - start < 6
      || (end === this.state.testChildren.length && end !== this.props.children.length)
      || this.state.lastCalculatedWidth > -1);

    // do we need to trim?
    if (contentHeight > this._targetHeight) {
      // chunk/ trim down
      if (linear) {
        this._setTestChildren(this.state.testChildren.length, this.state.testChildren.length - 1);
      } else {
        this._setTestChildren(start, halfWay);
      }

    // we've used all the characters in a window expand situation
    } else if (this.state.testChildren.length === this.props.children.length) {
      this._setChildren();
    } else if (linear) {
      // if we just got here by decrementing one, we're good
      if (start > end) {
        this._setChildren();
      } else {
        // window grew, increment up one
        this._setTestChildren(this.state.testChildren.length, this.state.testChildren.length + 1);
      }
    } else {
      // chunk up, still in binary search mode
      this._setTestChildren(halfWay, end);
    }
  }

  // this will render test children trimmed at halfway point then come around to test height again
  _setTestChildren(start, end) {
    // if it's within the treshold or has already been calculated, go linear
    const trimEnd = (end - start < 6 || this.state.lastCalculatedWidth > -1) ? end : end - Math.round((end - start) / 2);

    this.setState({ testChildren: this.props.children.substring(0, trimEnd) });
    this._callDeffered(this._checkHeight.bind(this, start, end));
  }

  _setChildren() {
    let children = this.props.children;

    // are we actually trimming?
    if (this.state.testChildren.length < this.props.children.length) {
      children = this.state.testChildren;
      if (children[children.length-1] == ' ') {
          children = children.slice(0, -2);
      } else {
          children = children.slice(0, -1);
      }
      children += '…';
    }
    this._handlingResize = false;
    this.setState({ children, lastCalculatedWidth: ReactDOM.findDOMNode(this.refs.spreader).offsetWidth });
  }

  // adds the trimmed content to state and fills the sizer on resize events
  handleResize() {
    // if we don't have a spreader, let it come around again
    if (!this.refs.spreader) { return; }

    const availableWidth = ReactDOM.findDOMNode(this.refs.spreader).offsetWidth;
    this._targetHeight = ReactDOM.findDOMNode(this.refs.sizer).offsetHeight;

    // set the max height right away, so that the resize throttle doesn't allow line break jumps
    // also populate with the full string if we don't have a working trimmed string yet
    this.setState({ fixHeight: this._targetHeight, children: this.state.children || this.props.children });

    // was there a width change?
    if (availableWidth !== this.state.lastCalculatedWidth && !this._handlingResize) {
      this._handlingResize = true;

      // first render?
      if (this.state.testChildren === '') {
        // give it the full string and check the height
        this.setState({ testChildren: this.props.children });
        this._callDeffered(this._checkHeight.bind(this, 0, this.props.children.length));

      // window got smaller?
      } else if (availableWidth < this.state.lastCalculatedWidth) {
        // increment down one
        this._callDeffered(this._checkHeight.bind(this, this.state.testChildren.length, this.state.testChildren.length - 1));

      // window got larger?
      } else {
        // increment up one
        this._callDeffered(this._checkHeight.bind(this, this.state.testChildren.length, this.state.testChildren.length + 1));
      }
    }
  }

  render() {
    const { fixHeight, children, testChildren } = this.state;
    const tagNames = { main: setTag(this.props.tagName) };

    const vertSpacers = [];
    for (let i = 0; i < this.props.lines; i++) {
      vertSpacers.push(<span style={block} key={i}>W</span>);
    }

    if (this.props.fixHeight) {
        wrapperStyles.height = `${fixHeight || 0}px`;
    }

    return (
      <tagNames.main className={this.props.className || ''} {...passProps(this.props)}>
        <span style={{ ...wrapperStyles, maxHeight: `${fixHeight || 0}px` }}>
          <span style={childrenStyles}>{children}</span>

          <span ref="spreader" style={spreaderStyles}>{this.props.children}</span>

          <span style={sizerWrapperStyles}>
            <span ref="sizer" style={block}>{vertSpacers}</span>
            <span ref="testChildren" style={block}>{testChildren}</span>
          </span>
        </span>
      </tagNames.main>
    );
  }
}

// in case someone acidentally passes something undefined in as children
Shiitake.defaultProps = { children: '' };

export default Shiitake;
