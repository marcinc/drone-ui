import Select from 'react-select';
import {branch} from 'baobab-react/higher-order';
import BuildCard from '../../components/build_card';
import {Link} from 'react-router';
import PageContent from '../../components/layout/content';
import React from 'react';
import {events, GET_REPO, GET_BUILD_LIST, FILTER_BUILD_HISTORY, FILTER_BUILD_HISTORY_CLEAR,
        FILTER_BUILD_HISTORY_SUGGESTIONS, FILTER_BUILD_HISTORY_SUGGESTIONS_CLEAR} from '../../actions/events';

import './index.less';
import 'react-select/less/default.less';

class Content extends React.Component {
  componentDidMount() {
    const {owner, name} = this.props.params;
    events.emit(GET_REPO, {owner, name});
    events.emit(GET_BUILD_LIST, {owner, name});
    if(this.props.location.query.build_filter) {
      events.emit(FILTER_BUILD_HISTORY, this.props.location.query.build_filter);
    }
  }

  componentWillUnmount() {
    events.emit(FILTER_BUILD_HISTORY_CLEAR);
    events.emit(FILTER_BUILD_HISTORY_SUGGESTIONS_CLEAR);
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
    events.emit(FILTER_BUILD_HISTORY, event);
  }

  populateFilterSuggestions(builds) {
    var dict = {};
    var item;

    Object.keys(builds).forEach(k => {
      item = builds[k];
      dict['author:' + item.author] = true;
      dict['branch:' + item.branch] = true;
      dict['status:' + item.status] = true;
      dict['event:' + item.event] = true;
      if(item.ref.includes('tags')) {
        dict['tag:' + item.ref.replace('refs/tags/', '')] = true;
      }
      if(item.deploy_to !== '') {
        dict['deploy_to:' + item.deploy_to] = true;
      }
    });

    var suggestions = Object.keys(dict).sort((a, b) => {return a > b;});
    suggestions = suggestions.map(item => {return {label:item, value:item};});
    events.emit(FILTER_BUILD_HISTORY_SUGGESTIONS, suggestions);
  }

  filterCriteria(build_filter) {
    const tags = ['tag', 'branch', 'author', 'status', 'event', 'deploy_to'];

    var predicates = {};

    var filters = build_filter.split(' ');
    filters.forEach(f => {
      var parts = f.split(':');
      if(!tags.includes(parts[0]) || parts[1] === undefined) { 
        return; 
      };

      var p;
      switch(parts[0]) {
      case 'tag':
        p = 'o.ref.includes("refs/tags/'+parts[1]+'")';
        break;
      case 'branch':
      case 'author':
      case 'event':
      case 'status':
      case 'deploy_to':
        p = 'o.'+parts[0]+'.includes("'+parts[1]+'")';
        break;
      }

      if(predicates.hasOwnProperty(parts[0])) {
        predicates[parts[0]].push(p);
      } else {
        predicates[parts[0]] = [p];
      }
    });

    var body;
    if(Object.keys(predicates).length > 0) {
      var conditions = [];
      Object.keys(predicates).forEach(k => {
        conditions.push('(' + predicates[k].join(' || ') + ')');
      });
      body = 'return ' + conditions.join(' && ') + ';';
    }

    return new Function('o', body);
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

    // populating build filter tag suggestions
    if (builds && (state == undefined || 
        (state.build_filter_suggestions == undefined || 
          state.build_filter_suggestions.length == 0))) {
      // console.log("** Building autocomplete suggestions");
      this.populateFilterSuggestions(builds);
    } else {
      // console.log("stored suggestions");
      // console.log(state.build_filter_suggestions);
    }

    // filtering the build with whatever was set in build_filter
    if(state !== undefined && state.build_filter) {
      Object.filter = (obj, predicate) => 
        Object.keys(obj)
          .filter(key => predicate(obj[key]))
          .reduce((res, key) => (res[key] = obj[key], res), {});

      builds = Object.filter(builds, this.filterCriteria(state.build_filter));
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

    // displaying tag filter box if suggestions are present i.e. there are builds 
    function filterBox(suggestions, callback) {
      return (
        <div>
          <Select multi simpleValue 
            value={state.build_filter}
            placeholder='Filter build history...' 
            options={state.build_filter_suggestions} 
            delimiter=' '
            onChange={callback} />
        </div>
      );
    }

    return (
      <PageContent className="repository history">
        {filterBox(state.build_filter_suggestions, this.onFilter)}
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
    state: ['pages', 'repo']
  };
}, Content);
