import {branch} from 'baobab-react/higher-order';
import BuildCard from '../../components/build_card';
import {Link} from 'react-router';
import PageContent from '../../components/layout/content';
import React from 'react';
import {events, GET_REPO, GET_BUILD_LIST, FILTER_BUILD_HISTORY, FILTER_BUILD_HISTORY_CLEAR} from '../../actions/events';

import './index.less';

class Content extends React.Component {
  componentDidMount() {
    const {owner, name} = this.props.params;
    events.emit(GET_REPO, {owner, name});
    events.emit(GET_BUILD_LIST, {owner, name});
  }

  componentWillUnmount() {
    events.emit(FILTER_BUILD_HISTORY_CLEAR);
  }

  shouldComponentUpdate(nextProps) {
    const {repository, builds, state} = this.props;
    return repository != nextProps.repository || builds != nextProps.builds || state != nextProps.state;
  }

  componentWillReceiveProps(nextProps) {
    const {owner, name} = this.props.params;
    const {owner: nextOwner, name: nextName} = nextProps.params;
    if (nextOwner != owner || nextName != name) {
      events.emit(GET_REPO, nextProps.params);
      events.emit(GET_BUILD_LIST, nextProps.params);
    }
  }

  onFilter(event) {
    events.emit(FILTER_BUILD_HISTORY, event.target.value);
  }

  render() {
    const {owner, name} = this.props.params;
    let {repository, builds, state} = this.props;

    if (repository instanceof Error) {
      return (
        <div className="alert alert-empty">This repository is Not Found</div>
      );
    }

    if (!repository || !builds) {
      return (
        <div>Loading...</div>
      );
    }

    if (!builds || Object.keys(builds).length == 0) {
      return (
        <div className="alert alert-empty">This repository does not have any builds yet.</div>
      );
    }

    function buildItem(number) {
      const build = builds[number];
      if (build instanceof Error) return null;
      return (
        <Link key={build.number} to={`/${owner}/${name}/${build.number}`}>
          <BuildCard build={build}/>
        </Link>
      );
    }

    function buildFilterCriteria() {
      const tags = ['tag', 'branch', 'author', 'status', 'event', 'deploy_to'];

      var predicates = [];

      var filters = state.filter.split(' ');
      filters.forEach(f => {
        var parts = f.split(':');
        if(!tags.includes(parts[0]) || parts[1] === '' || parts[1] === null || parts[1] === undefined) { 
          return; 
        };

        switch(parts[0]) {
        case "tag":
          predicates.push("o.event == 'tag' && o.ref.includes('refs/tags/"+parts[1]+"')");
          break;
        case "branch":
        case "author":
        case "event":
        case "status":
        case "deploy_to":
          predicates.push("o."+parts[0]+".includes('"+parts[1]+"')");
          break;
        }
      });

      var body;

      if(predicates.length > 0) {
        body = 'return ' + predicates.join(' && ') + ';';
      }

      return new Function('o', body);
    }

    Object.filter = (obj, predicate) => 
      Object.keys(obj)
        .filter( key => predicate(obj[key]) )
        .reduce( (res, key) => (res[key] = obj[key], res), {} );

    if(state !== undefined && state.filter) {
      var criteria = buildFilterCriteria();
      if (typeof criteria === "function") {
        builds = Object.filter(builds, criteria);
      }
    }

    return (
      <PageContent className="repository history">
        <div className="history-search">
          <input type="search" placeholder="Filter build history..." onChange={this.onFilter} spellCheck="off" />
        </div>
        {Object.keys(builds).sort((a, b) => {return b - a;}).map(buildItem)}
      </PageContent>
    );
  }

}

export default branch((props) => {
  const {owner, name} = props.params;
  return {
    repository: ['repos', owner, name],
    builds: ['builds', owner, name],
    state: ['pages', 'repo_history']
  };
}, Content);
