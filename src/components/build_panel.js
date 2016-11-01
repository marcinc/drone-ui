import {IconButton, Button, Textfield} from 'react-mdl';
import Humanize from './humanize';
import {Link} from 'react-router';
import React from 'react';
import TimeAgo from 'react-timeago';

import './build_panel.less';

export default
class BuildPanel extends React.Component {
  constructor(props) {
    super(props);

    this.addInputField = this.addInputField.bind(this);

    this.state = { 
      customParams: Object.keys(this.props.job.environment).reduce((params, key) => { 
        let value = this.props.job.environment[key];
        if (value) { // only show params with value
          params.push({
            fieldVal: key + '=' + value,
            show: true
          });
        }
        return params;
      }, [])
    }
  }

  addInputField() {
    let customParams = this.state.customParams;
    customParams.push({fieldVal: '', show: true});
    this.setState({customParams : customParams});
  }

  removeInputField(index) {
    let customParams = this.state.customParams;
    let key = customParams[index].fieldVal.split('=')[0];
    if (key) {
      // uset param value to remove it
      customParams[index] = {fieldVal: key + '=', show: false} 
    } else {
      delete customParams[index];
    }
    this.setState({customParams : customParams});
  }

  handleInputFieldChange(index, event) {
    let customParams = this.state.customParams;
    customParams[index].fieldVal = event.target.value;
    this.setState({customParams: customParams});
  }

  renderInputs() {
    return this.state.customParams.reduce((environs, o, i) => {
      let textFieldClasses = ['custom-param', o.show ? '' : 'hidden'].join(' ');
      let removeBtnClasses = ['remove-param', o.show ? '' : 'hidden'].join(' ');

      environs.push(
        <div key={'cp' + i}>
          <Textfield 
            key={'input' + i}
            className={textFieldClasses}
            label='PARAM=value...' 
            value={o.fieldVal} 
            onChange={this.handleInputFieldChange.bind(this, i)}/>
          <IconButton 
            name='clear' 
            key={'delete' + i} 
            className={removeBtnClasses}
            onClick={this.removeInputField.bind(this, i)}/>
        </div>)
      return environs;
    }, []);
  }

  renderParentLink(parent) {
    const {repo} = this.props;
    if (parent > 0) {
      return (
        <div>
          <em>Parent build:</em> <Link key={parent} to={`/${repo.owner}/${repo.name}/${parent}`}># {parent}</Link>
        </div>
      );
    }
  }

  render() {
    const {build, job} = this.props;

    let classes = ['build-panel', job.status];

    return (
      <div className={classes.join(' ')}>
        <div className="build-panel-detail">
          <div>
            <div><em>Branch:</em> {build.branch}</div>
            <div>
              <em>Commit:</em> {build.commit.substr(0,8)}
              <a href={build.link_url} target="_blank" className="commit-link">
                <i className="material-icons">insert_link</i>
              </a>
            </div>
            <div><em>Author:</em> {build.author}</div>
            {this.renderParentLink(build.parent)}
            <div className="input-group">
              {this.renderInputs()}
              <Button ripple onClick={this.addInputField} className="add-param">Add new param</Button>
            </div>
            <p>{build.message}</p>
          </div>
          <div>
            <div>
              <i className="material-icons">access_time</i>
              {job.started_at ?
                <TimeAgo date={(job.started_at || build.created_at) * 1000} /> :
                <span>--</span>
              }
            </div>
            <div>
              <i className="material-icons">timelapse</i>
              {job.finished_at ?
                <Humanize finished={job.finished_at} start={job.started_at} /> :
                <TimeAgo date={(job.started_at || build.created_at) * 1000} />
              }
            </div>
          </div>
        </div>
        <div>{this.props.children}</div>
      </div>
    );
  }
}
/**/
