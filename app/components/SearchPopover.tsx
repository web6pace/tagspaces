/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React, { useReducer, useRef, useState } from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import DateFnsUtils from '@date-io/date-fns';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import Box from '@mui/material/Box';
import { Theme } from '@mui/material/styles';
import withStyles from '@mui/styles/withStyles';
import makeStyles from '@mui/styles/makeStyles';
import format from 'date-fns/format';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '-/components/Tooltip';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Input from '@mui/material/Input';
import OutlinedInput from '@mui/material/OutlinedInput';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Select from '@mui/material/Select';
import FormControl from '@mui/material/FormControl';
import ButtonGroup from '@mui/material/ButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { mergeWithExtractedTags } from '@tagspaces/tagspaces-common/misc';
import AppConfig from '-/AppConfig';
import TagsSelect from './TagsSelect';
import { actions as AppActions, getDirectoryPath } from '../reducers/app';
import {
  actions as LocationIndexActions,
  isIndexing,
  getSearchQuery
} from '../reducers/location-index';
import {
  getCurrentLanguage,
  getMaxSearchResults,
  getShowUnixHiddenEntries
} from '-/reducers/settings';
import { styles, StyleProps } from './SearchInline.css';
import i18n from '../services/i18n';
import { FileTypeGroups, haveSearchFilters } from '-/services/search';
import { Pro } from '../pro';
import { formatDateTime, extractTimePeriod } from '-/utils/dates';
import { parseGeoLocation, parseLatLon } from '-/utils/geo';
import { getSearches } from '-/reducers/searches';
import { TS } from '-/tagspaces.namespace';
import { ProLabel, BetaLabel, ProTooltip } from '-/components/HelperComponents';
import Links from '-/content/links';
import GlobalSearch from '-/services/search-index';
import {
  CreateFileIcon,
  FolderIcon,
  UntaggedIcon,
  FileIcon,
  BookmarkIcon,
  BookIcon,
  DateIcon,
  EmailIcon,
  EditIcon,
  PictureIcon,
  DocumentIcon,
  NoteIcon,
  AudioIcon,
  VideoIcon,
  ArchiveIcon,
  CloseIcon
} from '-/components/CommonIcons';

const SaveSearchDialog = Pro && Pro.UI ? Pro.UI.SaveSearchDialog : false;

type PropsClasses = Record<keyof StyleProps, string>;

interface Props {
  style?: any;
  theme?: any;
  loadDirectoryContent: (
    path: string,
    generateThumbnails: boolean,
    loadDirMeta?: boolean
  ) => void;
  openURLExternally: (url: string, skipConfirmation?: boolean) => void;
  hideDrawer?: () => void;
  searchQuery: TS.SearchQuery; // () => any;
  setSearchResults: (entries: Array<any>) => void;
  exitSearchMode: () => void;
  setSearchQuery: (searchQuery: TS.SearchQuery) => void;
  currentDirectory: string;
  maxSearchResults: number;
  indexing: boolean;
  searches: Array<TS.SearchQuery>;
  showUnixHiddenEntries: boolean;
  // openSearchPanel: () => void;
  onClose: () => void;
  textQuery: string;
  setTextQuery: (value: string) => void;
}

const useStyles = makeStyles<Theme, StyleProps>(styles);

function SearchPopover(props: Props) {
  // @ts-ignore
  const classes: PropsClasses = useStyles({} as StyleProps);
  const [, forceUpdate] = useReducer(x => x + 1, 0);
  // const textQuery = useRef<string>(props.searchQuery.textQuery);
  // const tagsAND = useRef<Array<TS.Tag>>(props.searchQuery.tagsAND);
  const fileTypes = useRef<Array<string>>(
    props.searchQuery.fileTypes
      ? props.searchQuery.fileTypes
      : FileTypeGroups.any
  );

  const searchBoxing = props.searchQuery.searchBoxing
    ? props.searchQuery.searchBoxing
    : 'location';
  // useRef<'fuzzy' | 'semistrict' | 'strict'>(
  const searchType = props.searchQuery.searchType
    ? props.searchQuery.searchType
    : 'fuzzy';
  const lastModified = useRef<string>(
    props.searchQuery.lastModified ? props.searchQuery.lastModified : ''
  );
  const [saveSearchDialogOpened, setSaveSearchDialogOpened] = useState<
    TS.SearchQuery
  >(undefined);
  // const tagTimePeriod = useRef<string>('');
  // const tagTimePeriodHelper = useRef<string>(' ');
  const [tagPlace, setTagPlace] = useState<string>(' ');
  const [tagPlaceHelper, setTagPlaceHelper] = useState<string>(' ');
  const tagTimePeriodFrom = props.searchQuery.tagTimePeriodFrom // useRef<number | null>(
    ? props.searchQuery.tagTimePeriodFrom
    : null;
  const tagTimePeriodTo = props.searchQuery.tagTimePeriodTo //useRef<number | null>(
    ? props.searchQuery.tagTimePeriodTo
    : null;
  const [tagPlaceLat, setTagPlaceLat] = useState<number | null>(null);
  const [tagPlaceLong, setTagPlaceLong] = useState<number | null>(null);
  // const [tagPlaceRadius, setTagPlaceRadius] = useState<number>(0);
  const forceIndexing = useRef<boolean>(
    props.searchQuery.forceIndexing ? props.searchQuery.forceIndexing : false
  );
  const fileSize = useRef<string>(
    props.searchQuery.fileSize ? props.searchQuery.fileSize : ''
  );

  /*useEffect(() => {
    props.setTextQuery(props.searchQuery.textQuery);
  }, [props.searchQuery]);*/

  const handleFileTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const { value, name } = target;

    if (name === 'fileTypes') {
      const types = JSON.parse(value);
      fileTypes.current = types;
      const searchQuery = {
        ...props.searchQuery,
        searchBoxing: searchBoxing,
        fileTypes: types,
        showUnixHiddenEntries: props.showUnixHiddenEntries,
        executeSearch: false
      };
      props.setSearchQuery(searchQuery);
    }
  };

  const handleFileSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { target } = event;
    const { value, name } = target;

    if (name === 'fileSize') {
      fileSize.current = value;
      const searchQuery = {
        ...props.searchQuery,
        searchBoxing: searchBoxing,
        fileSize: value,
        showUnixHiddenEntries: props.showUnixHiddenEntries,
        executeSearch: false
      };

      props.setSearchQuery(searchQuery);
    }
  };

  const handleLastModifiedChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { target } = event;
    const { value, name } = target;

    if (name === 'lastModified') {
      lastModified.current = value;
      const searchQuery = {
        ...props.searchQuery,
        searchBoxing: searchBoxing,
        lastModified: value,
        showUnixHiddenEntries: props.showUnixHiddenEntries,
        executeSearch: false
      };
      props.setSearchQuery(searchQuery);
    }
  };

  const handleSavedSearchChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const { target } = event;
    const { value } = target;

    const savedSearch = props.searches.find(search => search.uuid === value);
    if (!savedSearch) {
      return true;
    }
    props.setTextQuery(savedSearch.textQuery ? savedSearch.textQuery : '');
    fileTypes.current = savedSearch.fileTypes;
    lastModified.current = savedSearch.lastModified;
    fileSize.current = savedSearch.fileSize;
    //searchType.current = savedSearch.searchType;
    //searchBoxing.current = savedSearch.searchBoxing;
    forceIndexing.current = savedSearch.forceIndexing;

    //let ttPeriod;
    // tagTimePeriodFrom.current = savedSearch.tagTimePeriodFrom;
    /* if (savedSearch.tagTimePeriodFrom) {
      ttPeriod = format(new Date(savedSearch.tagTimePeriodFrom), 'yyyyMMdd');
    }*/

    // tagTimePeriodTo.current = savedSearch.tagTimePeriodTo;
    /*if (savedSearch.tagTimePeriodTo) {
      ttPeriod +=
        '-' + format(new Date(savedSearch.tagTimePeriodTo), 'yyyyMMdd');
    }*/

    /*if (ttPeriod) {
      tagTimePeriod.current = ttPeriod;
    }*/

    props.setSearchQuery({
      ...savedSearch,
      tagTimePeriodFrom: savedSearch.tagTimePeriodFrom,
      tagTimePeriodTo: savedSearch.tagTimePeriodTo,
      showUnixHiddenEntries: props.showUnixHiddenEntries
    });
  };

  function removeTags(tagsArray, removeTagsArray) {
    // eslint-disable-next-line react/no-access-state-in-setstate
    return tagsArray.filter(tag =>
      removeTagsArray.some(valueTag => valueTag.title !== tag.title)
    );
  }

  const handleTagFieldChange = (name, value, reason) => {
    let searchQuery;
    if (reason === 'remove-value') {
      if (name === 'tagsAND') {
        searchQuery = {
          ...props.searchQuery,
          tagsAND: removeTags(props.searchQuery.tagsAND, value)
        };
      } else if (name === 'tagsNOT') {
        searchQuery = {
          ...props.searchQuery,
          tagsNOT: removeTags(props.searchQuery.tagsNOT, value)
        };
      } else if (name === 'tagsOR') {
        searchQuery = {
          ...props.searchQuery,
          tagsOR: removeTags(props.searchQuery.tagsOR, value)
        };
      }
    } else {
      // eslint-disable-next-line no-lonely-if
      if (name === 'tagsAND') {
        searchQuery = { ...props.searchQuery, tagsAND: value };
      } else if (name === 'tagsNOT') {
        searchQuery = { ...props.searchQuery, tagsNOT: value };
      } else if (name === 'tagsOR') {
        searchQuery = { ...props.searchQuery, tagsOR: value };
      }
    }
    if (!haveSearchFilters(searchQuery)) {
      clearSearch();
    } else {
      props.setSearchQuery({
        ...searchQuery,
        searchBoxing: searchBoxing,
        showUnixHiddenEntries: props.showUnixHiddenEntries,
        executeSearch: false
      });
    }
  };

  const handleSearchTermChange = event => {
    const { target } = event;
    const { value } = target;
    props.setTextQuery(value);
  };

  /*const handleTimePeriodChange = event => {
    const { target } = event;
    const { value } = target;
    const { fromDateTime, toDateTime } = extractTimePeriod(value);

    if (toDateTime && fromDateTime) {
      const tagTPeriodHelper =
        'From: ' +
        formatDateTime(fromDateTime) +
        ' To: ' +
        formatDateTime(toDateTime);
      tagTimePeriodFrom.current = fromDateTime.getTime();
      tagTimePeriodTo.current = toDateTime.getTime();
      tagTimePeriodHelper.current = tagTPeriodHelper;
    } else {
      tagTimePeriodFrom.current = null;
      tagTimePeriodTo.current = null;
      tagTimePeriodHelper.current = ' ';
    }
    // tagTimePeriod.current = value;
    forceUpdate();
  };*/

  const handlePlaceChange = event => {
    const { target } = event;
    const { value } = target;
    let lat = null;
    let lng = null;
    let tagPHelper;

    const location = parseGeoLocation(value);
    if (location !== undefined) {
      ({ lat, lng } = location);
    } else {
      const latLon = parseLatLon(value);
      if (latLon) {
        ({ lat } = latLon);
        lng = latLon.lon;
      }
    }

    if (lat && lng) {
      tagPHelper = 'Place at lat: ' + lat + ' long: ' + lng;
    } else {
      tagPHelper = '';
    }
    setTagPlace(value);
    setTagPlaceLat(lat);
    setTagPlaceLong(lng);
    setTagPlaceHelper(tagPHelper);
  };

  const startSearch = event => {
    if (event.key === 'Enter' || event.keyCode === 13) {
      if (props.hideDrawer) {
        props.hideDrawer();
      }
      executeSearch();
    }
  };

  function openCurrentDirectory() {
    if (props.currentDirectory) {
      props.loadDirectoryContent(props.currentDirectory, false, true);
    } else {
      props.exitSearchMode();
    }
  }

  const clearSearch = () => {
    props.setTextQuery('');
    //searchBoxing.current = 'location';
    //searchType.current = 'fuzzy';
    fileTypes.current = FileTypeGroups.any;
    lastModified.current = '';
    // tagTimePeriod.current = '';
    //tagTimePeriodHelper.current = ' ';
    setTagPlace(' ');
    setTagPlaceHelper(' ');
    //tagTimePeriodFrom.current = null;
    //tagTimePeriodTo.current = null;
    setTagPlaceLat(null);
    setTagPlaceLong(null);
    // setTagPlaceRadius(0);
    forceIndexing.current = false;
    fileSize.current = '';
    props.setSearchQuery({});
    props.exitSearchMode();
    openCurrentDirectory();
    props.onClose();
  };

  const saveSearch = (isNew = true) => {
    const tagsAND = mergeWithExtractedTags(
      props.textQuery,
      props.searchQuery.tagsAND,
      '+'
    );
    const tagsOR = mergeWithExtractedTags(
      props.textQuery,
      props.searchQuery.tagsOR,
      '|'
    );
    const tagsNOT = mergeWithExtractedTags(
      props.textQuery,
      props.searchQuery.tagsNOT,
      '-'
    );
    setSaveSearchDialogOpened({
      uuid: isNew ? undefined : props.searchQuery.uuid,
      title: props.searchQuery.title,
      textQuery: props.textQuery,
      tagsAND,
      tagsOR,
      tagsNOT,
      searchBoxing: searchBoxing,
      searchType: searchType,
      fileTypes: fileTypes.current,
      lastModified: lastModified.current,
      fileSize: fileSize.current,
      tagTimePeriodFrom: tagTimePeriodFrom,
      tagTimePeriodTo: tagTimePeriodTo,
      tagPlaceLat,
      tagPlaceLong,
      // tagPlaceRadius,
      maxSearchResults: props.maxSearchResults,
      currentDirectory: props.currentDirectory,
      forceIndexing: forceIndexing.current
    });
  };

  const switchSearchBoxing = (
    event: React.MouseEvent<HTMLElement>,
    boxing: 'location' | 'folder' | 'global'
  ) => {
    if (boxing !== null) {
      const searchQuery = {
        ...props.searchQuery,
        searchBoxing: boxing,
        executeSearch: false
      };
      props.setSearchQuery(searchQuery);

      /*searchBoxing.current = boxing;
      forceUpdate();*/
    }
  };

  const switchSearchType = (
    event: React.MouseEvent<HTMLElement>,
    type: 'fuzzy' | 'semistrict' | 'strict'
  ) => {
    if (type !== null) {
      const searchQuery = {
        ...props.searchQuery,
        searchType: type,
        executeSearch: false
      };
      props.setSearchQuery(searchQuery);

      /*searchType.current = type;
      forceUpdate();*/
    }
  };

  const executeSearch = () => {
    const tagsAND = mergeWithExtractedTags(
      props.textQuery,
      props.searchQuery.tagsAND,
      '+'
    );
    const tagsOR = mergeWithExtractedTags(
      props.textQuery,
      props.searchQuery.tagsOR,
      '|'
    );
    const tagsNOT = mergeWithExtractedTags(
      props.textQuery,
      props.searchQuery.tagsNOT,
      '-'
    );
    const searchQuery: TS.SearchQuery = {
      textQuery: props.textQuery,
      tagsAND,
      tagsOR,
      tagsNOT,
      searchBoxing: searchBoxing,
      searchType: searchType,
      fileTypes: fileTypes.current,
      lastModified: lastModified.current,
      fileSize: fileSize.current,
      tagTimePeriodFrom: tagTimePeriodFrom,
      tagTimePeriodTo: tagTimePeriodTo,
      tagPlaceLat,
      tagPlaceLong,
      // tagPlaceRadius,
      maxSearchResults: props.maxSearchResults,
      currentDirectory: props.currentDirectory,
      forceIndexing: forceIndexing.current,
      showUnixHiddenEntries: props.showUnixHiddenEntries,
      executeSearch: true
    };
    console.log('Search object: ' + JSON.stringify(searchQuery));
    props.setSearchQuery(searchQuery);
    props.onClose();
  };

  const { indexing, theme } = props;
  const indexStatus = GlobalSearch.getInstance().getIndex()
    ? GlobalSearch.getInstance().getIndex().length + ' indexed entries'
    : '';
  return (
    <div
      style={{
        maxWidth: 400,
        height: '100%'
      }}
    >
      <div className={classes.toolbar}>
        <Typography variant="button" style={{ margin: '12px 0 10px 10px' }}>
          {i18n.t('core:advancedSearch')}
        </Typography>
        <Typography
          variant="caption"
          className={classes.header}
          style={{ flex: 1, margin: 'auto', paddingLeft: 10 }}
        >
          {'(' + indexStatus + ')'}
        </Typography>
        <IconButton
          style={{ marginLeft: 'auto' }}
          data-tid="closeSearchTID"
          onClick={props.onClose}
          size="large"
        >
          <CloseIcon />
        </IconButton>
      </div>
      <div
        style={{
          paddingTop: 0,
          paddingLeft: 10,
          paddingRight: 10,
          marginTop: 0,
          height: 'calc(100% - 90px)',
          maxHeight: 'calc(100% - 90px)',
          overflowX: 'hidden',
          overflowY: 'auto',
          scrollbarGutter: 'stable'
        }}
        data-tid="searchAdvancedTID"
      >
        <Grid
          container
          spacing={2}
          style={{ marginBottom: 15 }}
          direction="row"
          justifyContent="center"
          alignItems="flex-end"
        >
          <Grid item xs={9}>
            <ProTooltip tooltip={i18n.t('storedSearchQueriesTooltip')}>
              <FormControl
                variant="outlined"
                style={{ width: '100%', marginTop: 6 }}
              >
                <InputLabel
                  id="saved-searches"
                  style={{ backgroundColor: theme.palette.background.default }}
                >
                  {i18n.t('core:savedSearchesTitle')}
                </InputLabel>
                <Select
                  name="savedSearch"
                  labelId="saved-searches"
                  disabled={indexing || !Pro}
                  onChange={handleSavedSearchChange}
                  displayEmpty
                  fullWidth
                  value={props.searchQuery.uuid ? props.searchQuery.uuid : -1}
                >
                  <MenuItem value={-1} style={{ display: 'none' }} />
                  {props.searches.length < 1 && (
                    <MenuItem>{i18n.t('noSavedSearches')}</MenuItem>
                  )}
                  {props.searches.map(search => (
                    <MenuItem key={search.uuid} value={search.uuid}>
                      <span style={{ width: '100%' }}>{search.title}</span>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </ProTooltip>
          </Grid>
          <Grid item xs={3} style={{ display: 'flex', alignSelf: 'center' }}>
            <ButtonGroup
              style={{
                textAlign: 'center',
                width: '100%'
              }}
            >
              {props.searchQuery.uuid && (
                <Tooltip title={i18n.t('editSavedSearchTitle')}>
                  <IconButton
                    data-tid="editSearchBtnTID"
                    size="small"
                    onClick={() => saveSearch(false)}
                  >
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title={i18n.t('createNewSavedSearchTitle')}>
                <IconButton
                  disabled={!Pro}
                  data-tid="addSearchBtnTID"
                  size="small"
                  onClick={() => saveSearch()}
                >
                  <CreateFileIcon />
                </IconButton>
              </Tooltip>
            </ButtonGroup>
          </Grid>
          <Grid item xs={12}>
            <TextField
              id="searchTerm"
              label={i18n.t('core:searchHasTheWords')}
              value={props.textQuery}
              onChange={handleSearchTermChange}
              onKeyDown={startSearch}
              style={{ width: '100%' }}
            />
          </Grid>
        </Grid>
        <FormControl className={classes.formControl} disabled={indexing}>
          <ToggleButtonGroup
            onChange={switchSearchBoxing}
            size="small"
            exclusive
            style={{ marginBottom: 10, alignSelf: 'center' }}
            value={searchBoxing}
          >
            <ToggleButton value="location">
              <Tooltip title={i18n.t('searchPlaceholder')}>
                <div>{i18n.t('location')}</div>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="folder">
              <Tooltip title={i18n.t('searchCurrentFolderWithSubFolders')}>
                <div>{i18n.t('folder')}</div>
              </Tooltip>
            </ToggleButton>
            <ToggleButton disabled={!Pro} value="global">
              <Tooltip title={i18n.t('searchInAllLocationTooltip')}>
                <div>{i18n.t('globalSearch')}</div>
              </Tooltip>
              {Pro ? <BetaLabel /> : <ProLabel />}
            </ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
        <FormControl className={classes.formControl} disabled={indexing}>
          <ToggleButtonGroup
            onChange={switchSearchType}
            size="small"
            exclusive
            style={{ marginBottom: 10, alignSelf: 'center' }}
            value={searchType}
          >
            <ToggleButton value="fuzzy" data-tid="fuzzySearchTID">
              <Tooltip title={i18n.t('searchTypeFuzzyTooltip')}>
                <div>{i18n.t('searchTypeFuzzy')}</div>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="semistrict" data-tid="semiStrictSearchTID">
              <Tooltip title={i18n.t('searchTypeSemiStrictTooltip')}>
                <div>{i18n.t('searchTypeSemiStrict')}</div>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value="strict" data-tid="strictSearchTID">
              <Tooltip title={i18n.t('searchTypeStrictTooltip')}>
                <div>{i18n.t('searchTypeStrict')}</div>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
        <FormControl className={classes.formControl} disabled={indexing}>
          <ToggleButtonGroup
            onChange={() => {
              forceIndexing.current = !forceIndexing.current;
              forceUpdate();
            }}
            size="small"
            exclusive
            style={{ marginBottom: 10, alignSelf: 'center' }}
            value={forceIndexing.current}
          >
            <ToggleButton value={false}>
              <Tooltip title={i18n.t('useCurrentIndexTooltip')}>
                <div>{i18n.t('useCurrentIndex')}</div>
              </Tooltip>
            </ToggleButton>
            <ToggleButton value={true} data-tid="forceIndexingTID">
              <Tooltip title={i18n.t('forceReindexTooltip')}>
                <div>{i18n.t('forceReindex')}</div>
              </Tooltip>
            </ToggleButton>
          </ToggleButtonGroup>
        </FormControl>
        <FormControl className={classes.formControl} disabled={indexing}>
          <TagsSelect
            dataTid="searchTagsAndTID"
            placeholderText={i18n.t('core:selectTags')}
            label={i18n.t('core:mustContainTheseTags')}
            tags={props.searchQuery.tagsAND}
            handleChange={handleTagFieldChange}
            tagSearchType="tagsAND"
            tagMode="remove"
          />
        </FormControl>
        <FormControl className={classes.formControl} disabled={indexing}>
          <TagsSelect
            dataTid="searchTagsOrTID"
            placeholderText={i18n.t('core:selectTags')}
            tags={props.searchQuery.tagsOR}
            label={i18n.t('core:atLeastOneOfTheseTags')}
            handleChange={handleTagFieldChange}
            tagSearchType="tagsOR"
            tagMode="remove"
          />
        </FormControl>
        <FormControl className={classes.formControl} disabled={indexing}>
          <TagsSelect
            dataTid="searchTagsNotTID"
            placeholderText={i18n.t('core:selectTags')}
            tags={props.searchQuery.tagsNOT}
            label={i18n.t('core:noneOfTheseTags')}
            handleChange={handleTagFieldChange}
            tagSearchType="tagsNOT"
            tagMode="remove"
          />
        </FormControl>
        <FormControl
          className={classes.formControl}
          disabled={indexing || !Pro}
        >
          <ProTooltip tooltip={i18n.t('filterByTypTooltip')}>
            <InputLabel htmlFor="file-type">
              {i18n.t('core:fileType')}
            </InputLabel>
            <Select
              fullWidth
              value={JSON.stringify(fileTypes.current)}
              onChange={handleFileTypeChange}
              input={
                <OutlinedInput
                  name="fileTypes"
                  id="file-type"
                  label={i18n.t('core:fileType')}
                />
              }
            >
              <MenuItem value={JSON.stringify(FileTypeGroups.any)}>
                {i18n.t('core:anyType')}
              </MenuItem>
              <MenuItem value={JSON.stringify(FileTypeGroups.folders)}>
                <IconButton size="large">
                  <FolderIcon />
                </IconButton>
                {i18n.t('core:searchFolders')}
              </MenuItem>
              <MenuItem value={JSON.stringify(FileTypeGroups.files)}>
                <IconButton size="large">
                  <FileIcon />
                </IconButton>
                {i18n.t('core:searchFiles')}
              </MenuItem>
              <MenuItem value={JSON.stringify(FileTypeGroups.untagged)}>
                <IconButton size="large">
                  <UntaggedIcon />
                </IconButton>
                {i18n.t('core:searchUntaggedEntries')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.images)}
                title={FileTypeGroups.images.toString()}
              >
                <IconButton size="large">
                  <PictureIcon />
                </IconButton>
                {i18n.t('core:searchPictures')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.documents)}
                title={FileTypeGroups.documents.toString()}
              >
                <IconButton size="large">
                  <DocumentIcon />
                </IconButton>
                {i18n.t('core:searchDocuments')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.notes)}
                title={FileTypeGroups.notes.toString()}
              >
                <IconButton size="large">
                  <NoteIcon />
                </IconButton>
                {i18n.t('core:searchNotes')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.audio)}
                title={FileTypeGroups.audio.toString()}
              >
                <IconButton size="large">
                  <AudioIcon />
                </IconButton>
                {i18n.t('core:searchAudio')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.video)}
                title={FileTypeGroups.video.toString()}
              >
                <IconButton size="large">
                  <VideoIcon />
                </IconButton>
                {i18n.t('core:searchVideoFiles')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.archives)}
                title={FileTypeGroups.archives.toString()}
              >
                <IconButton size="large">
                  <ArchiveIcon />
                </IconButton>
                {i18n.t('core:searchArchives')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.bookmarks)}
                title={FileTypeGroups.bookmarks.toString()}
              >
                <IconButton size="large">
                  <BookmarkIcon />
                </IconButton>
                {i18n.t('core:searchBookmarks')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.ebooks)}
                title={FileTypeGroups.ebooks.toString()}
              >
                <IconButton size="large">
                  <BookIcon />
                </IconButton>
                {i18n.t('core:searchEbooks')}
              </MenuItem>
              <MenuItem
                value={JSON.stringify(FileTypeGroups.emails)}
                title={FileTypeGroups.emails.toString()}
              >
                <IconButton size="large">
                  <EmailIcon />
                </IconButton>
                {i18n.t('core:searchEmails')}
              </MenuItem>
            </Select>
          </ProTooltip>
        </FormControl>
        <FormControl
          className={classes.formControl}
          disabled={indexing || !Pro}
        >
          <ProTooltip tooltip={i18n.t('filterBySizeTooltip')}>
            <InputLabel
              style={{ backgroundColor: theme.palette.background.default }}
              shrink
              htmlFor="file-size"
            >
              {i18n.t('core:sizeSearchTitle')}
            </InputLabel>
            <Select
              fullWidth
              value={fileSize.current}
              onChange={handleFileSizeChange}
              input={
                <OutlinedInput
                  name="fileSize"
                  id="file-size"
                  label={i18n.t('core:sizeSearchTitle')}
                />
              }
              displayEmpty
            >
              <MenuItem value="">{i18n.t('core:sizeAny')}</MenuItem>
              <MenuItem value="sizeEmpty">{i18n.t('core:sizeEmpty')}</MenuItem>
              <MenuItem value="sizeTiny">
                {i18n.t('core:sizeTiny')}
                &nbsp;(&lt;&nbsp;10KB)
              </MenuItem>
              <MenuItem value="sizeVerySmall">
                {i18n.t('core:sizeVerySmall')}
                &nbsp;(&lt;&nbsp;100KB)
              </MenuItem>
              <MenuItem value="sizeSmall">
                {i18n.t('core:sizeSmall')}
                &nbsp;(&lt;&nbsp;1MB)
              </MenuItem>
              <MenuItem value="sizeMedium">
                {i18n.t('core:sizeMedium')}
                &nbsp;(&lt;&nbsp;50MB)
              </MenuItem>
              <MenuItem value="sizeLarge">
                {i18n.t('core:sizeLarge')}
                &nbsp;(&lt;&nbsp;1GB)
              </MenuItem>
              <MenuItem value="sizeHuge">
                {i18n.t('core:sizeHuge')}
                &nbsp;(&gt;&nbsp;1GB)
              </MenuItem>
            </Select>
          </ProTooltip>
        </FormControl>
        <FormControl
          className={classes.formControl}
          disabled={indexing || !Pro}
        >
          <ProTooltip tooltip={i18n.t('filterByLastModifiedDateTooltip')}>
            <InputLabel
              style={{ backgroundColor: theme.palette.background.default }}
              shrink
              htmlFor="modification-date"
            >
              {i18n.t('core:lastModifiedSearchTitle')}
            </InputLabel>
            <Select
              fullWidth
              value={lastModified.current}
              onChange={handleLastModifiedChange}
              input={
                <OutlinedInput
                  name="lastModified"
                  id="modification-date"
                  label={i18n.t('core:lastModifiedSearchTitle')}
                />
              }
              displayEmpty
            >
              <MenuItem value="">{i18n.t('core:anyTime')}</MenuItem>
              <MenuItem value="today">{i18n.t('core:today')}</MenuItem>
              <MenuItem value="yesterday">{i18n.t('core:yesterday')}</MenuItem>
              <MenuItem value="past7Days">{i18n.t('core:past7Days')}</MenuItem>
              <MenuItem value="past30Days">
                {i18n.t('core:past30Days')}
              </MenuItem>
              <MenuItem value="past6Months">
                {i18n.t('core:past6Months')}
              </MenuItem>
              <MenuItem value="pastYear">{i18n.t('core:pastYear')}</MenuItem>
              <MenuItem value="moreThanYear">
                {i18n.t('core:moreThanYear')}
              </MenuItem>
            </Select>
          </ProTooltip>
        </FormControl>
        <FormControl className={classes.formControl}>
          <ProTooltip tooltip={i18n.t('enterTimePeriodTooltip')}>
            <LocalizationProvider
              dateAdapter={AdapterDateFns}
              utils={DateFnsUtils}
            >
              <Box position="relative" display="inline-flex">
                <DatePicker
                  label={i18n.t('enterTagTimePeriodFrom')}
                  disabled={indexing || !Pro}
                  inputFormat="yyyy-MM-dd"
                  value={tagTimePeriodFrom}
                  onChange={(fromDataTime: Date) => {
                    if (fromDataTime) {
                      const searchQuery = {
                        ...props.searchQuery,
                        tagTimePeriodFrom: fromDataTime.getTime(),
                        executeSearch: false
                      };
                      props.setSearchQuery(searchQuery);
                    }
                  }}
                  renderInput={params => <TextField {...params} />}
                />
                <DatePicker
                  label={i18n.t('enterTagTimePeriodTo')}
                  disabled={indexing || !Pro}
                  inputFormat="yyyy-MM-dd"
                  value={tagTimePeriodTo}
                  onChange={(toDataTime: Date) => {
                    if (toDataTime) {
                      const searchQuery = {
                        ...props.searchQuery,
                        tagTimePeriodTo: toDataTime.getTime(),
                        executeSearch: false
                      };
                      props.setSearchQuery(searchQuery);
                    }
                  }}
                  renderInput={params => (
                    <TextField style={{ marginLeft: 5 }} {...params} />
                  )}
                />
              </Box>
            </LocalizationProvider>
            {/*<TextField
              id="tagTimePeriod"
              label={i18n.t('enterTimePeriod')}
              value={tagTimePeriod.current}
              disabled={indexing || !Pro}
              onChange={handleTimePeriodChange}
              onKeyDown={startSearch}
              helperText={tagTimePeriodHelper.current}
              error={tagTimePeriodHelper.current.length < 1}
              style={{ width: '100%' }}
              InputProps={{
                endAdornment: (
                    <InputAdornment
                      position="end"
                      title="201905 for May 2019 / 20190412 for 12th of April 2019 / 20190501~124523 for specific time"
                    >
                      <IconButton size="large">
                        <DateIcon />
                      </IconButton>
                    </InputAdornment>
                )
              }}
            />*/}
          </ProTooltip>
          {/* <TextField
                id="tagPlace"
                label={i18n.t('GPS coordinates or plus code')}
                value={tagPlace}
                disabled={indexing || !Pro}
                onChange={handlePlaceChange}
                onKeyDown={startSearch}
                helperText={tagPlaceHelper}
                error={tagPlaceHelper.length < 1}
                InputProps={{
                  endAdornment: (
                    <InputAdornment
                      position="end"
                      title="GPS: 49.23276,12.43123 PlusCode: 8FRG8Q87+6X"
                    >
                      <IconButton onClick={openPlace}>
                        <PlaceIcon />
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              /> */}
        </FormControl>
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          padding: 5
        }}
      >
        <Button
          size="small"
          variant="text"
          data-tid="helpSearchButtonTID"
          onClick={() =>
            props.openURLExternally(Links.documentationLinks.search, true)
          }
        >
          {i18n.t('help')}
        </Button>
        <div>
          <Button
            variant="text"
            size="small"
            onClick={clearSearch}
            id="resetSearchButton"
          >
            {i18n.t('resetBtn')}
          </Button>
          <Button
            disabled={indexing}
            variant="contained"
            id="searchButtonAdvTID"
            onClick={executeSearch}
            size="small"
          >
            {indexing
              ? 'Search disabled while indexing'
              : i18n.t('searchTitle')}
          </Button>
        </div>
      </div>
      {SaveSearchDialog && saveSearchDialogOpened !== undefined && (
        <SaveSearchDialog
          open={true}
          onClose={(searchQuery: TS.SearchQuery) => {
            setSaveSearchDialogOpened(undefined);
            if (searchQuery) {
              props.setSearchQuery({
                ...searchQuery,
                showUnixHiddenEntries: props.showUnixHiddenEntries
              });
            }
          }}
          onClearSearch={() => clearSearch()}
          searchQuery={saveSearchDialogOpened}
        />
      )}
    </div>
  );
}

function mapStateToProps(state) {
  return {
    indexing: isIndexing(state),
    searchQuery: getSearchQuery(state),
    currentDirectory: getDirectoryPath(state),
    maxSearchResults: getMaxSearchResults(state),
    searches: getSearches(state),
    showUnixHiddenEntries: getShowUnixHiddenEntries(state),
    language: getCurrentLanguage(state)
  };
}

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      setSearchQuery: LocationIndexActions.setSearchQuery,
      createLocationsIndexes: LocationIndexActions.createLocationsIndexes,
      loadDirectoryContent: AppActions.loadDirectoryContent,
      openURLExternally: AppActions.openURLExternally,
      setSearchResults: AppActions.setSearchResults,
      exitSearchMode: AppActions.exitSearchMode
    },
    dispatch
  );
}

const areEqual = (prevProp, nextProp) =>
  nextProp.language === prevProp.language &&
  nextProp.indexing === prevProp.indexing &&
  nextProp.searchQuery === prevProp.searchQuery &&
  nextProp.textQuery === prevProp.textQuery &&
  nextProp.currentDirectory === prevProp.currentDirectory &&
  JSON.stringify(nextProp.searches) === JSON.stringify(prevProp.searches) &&
  JSON.stringify(nextProp.classes) === JSON.stringify(prevProp.classes);

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(
  React.memo(
    withStyles(undefined, { withTheme: true })(SearchPopover),
    areEqual
  )
);
