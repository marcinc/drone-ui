import {branch} from 'baobab-react/higher-order';
import BuildCard from '../../components/build_card';
import {Link} from 'react-router';
import PageContent from '../../components/layout/content';
import React from 'react';
import Select from 'react-select';
import {events, GET_REPO, GET_BUILD_LIST, BUILD_FILTER, BUILD_FILTER_CLEAR,
        BUILD_FILTER_SUGGESTIONS, BUILD_FILTER_SUGGESTIONS_CLEAR} from '../../actions/events';

import './index.less';
import 'react-select/less/default.less';

class Content extends React.Component {
  constructor(props) {
    super(props);

    this.onFilter = this.onFilter.bind(this);
    this.filterCriteria = this.filterCriteria.bind(this);
    this.setFilterSuggestions = this.setFilterSuggestions.bind(this);
  }

  componentDidMount() {
    const {owner, name} = this.props.params;
    events.emit(GET_REPO, {owner, name});
    events.emit(GET_BUILD_LIST, {owner, name});
    // if filter is present in query string then use it
    var value = this.props.location.query.filter;
    if(value) {
      events.emit(BUILD_FILTER, {owner, name, value});
    }
  }

  componentWillUnmount() {
    const {owner, name} = this.props.params;
    events.emit(BUILD_FILTER_CLEAR, {owner, name});
    events.emit(BUILD_FILTER_SUGGESTIONS_CLEAR, {owner, name});
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

  componentDidUpdate() {
    const {builds, state} = this.props;

    // populating build filter tag suggestions
    if (builds && (state == undefined || state.suggestions == undefined || state.suggestions.length == 0)) {
      this.setFilterSuggestions();
    }
  }

  setFilterSuggestions() {
    const {owner, name} = this.props.params;
    const {builds} = this.props;

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
    events.emit(BUILD_FILTER_SUGGESTIONS, {owner, name, suggestions});
  }

  filterCriteria() {
    const {state} = this.props;
    const tags = ['tag', 'branch', 'author', 'status', 'event', 'deploy_to'];

    var predicates = {};

    var filters = state.filter.split(' ');
    filters.forEach(tag => {
      var parts = tag.split(':');
      if(!tags.includes(parts[0])) { 
        return; 
      }

      var p;
      switch(parts[0]) {
      case 'branch':
      case 'author':
      case 'event':
      case 'status':
      case 'deploy_to':
        p = 'o.'+parts[0]+'.includes("'+parts[1]+'")';
        break;
      case 'tag':
        p = 'o.ref.includes("refs/tags/'+parts[1]+'")';
        break;
      }

      if(predicates.hasOwnProperty(parts[0])) {
        predicates[parts[0]].push(p);
      } else {
        predicates[parts[0]] = [p];
      }
    });

    var func_body;
    if(Object.keys(predicates).length > 0) {
      var conditions = [];
      Object.keys(predicates).forEach(k => {
        conditions.push('(' + predicates[k].join(' || ') + ')');
      });
      func_body = 'return ' + conditions.join(' && ') + ';';
    }

    return new Function('o', func_body);
  }

  onFilter(value) {
    const {owner, name} = this.props.params;
    events.emit(BUILD_FILTER, {owner, name, value});
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

    // filtering builds
    if(state && state.filter) {
      Object.filter = (obj, predicate) => 
        Object.keys(obj)
          .filter(key => predicate(obj[key]))
          .reduce((res, key) => (res[key] = obj[key], res), {});

      builds = Object.filter(builds, this.filterCriteria());
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

    return (
      <PageContent className="repository history">
        <Select multi simpleValue 
          value={(state && state.filter) ? state.filter : ''}
          placeholder='Filter build history...' 
          options={(state && state.suggestions) ? state.suggestions : []} 
          delimiter=' '
          onChange={this.onFilter} />
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
    state: ['pages', 'repo', owner, name]
  };
}, Content);
