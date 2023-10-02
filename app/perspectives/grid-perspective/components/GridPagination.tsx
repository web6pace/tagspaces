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

import React, { useEffect, useReducer, useRef } from 'react';
import { connect } from 'react-redux';
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Tooltip from '-/components/Tooltip';
import Grid from '@mui/material/Grid';
import Box from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import Pagination from '@mui/material/Pagination';
import AppConfig from '-/AppConfig';
import { extractDirectoryName } from '@tagspaces/tagspaces-common/paths';
import {
  getCurrentDirectoryColor,
  getIsMetaLoaded,
  getCurrentDirectoryTags,
  getCurrentDirectoryDescription,
  getLastBackgroundImageChange,
  getLastThumbnailImageChange,
  getLastSelectedEntryPath,
  getLastSearchTimestamp
} from '-/reducers/app';
import EntryIcon from '-/components/EntryIcon';
import TagsPreview from '-/components/TagsPreview';
import TagContainer from '-/components/TagContainer';
import { TS } from '-/tagspaces.namespace';
import {
  getDescriptionPreview,
  getFolderThumbPath,
  getFolderBgndPath
} from '-/services/utils-io';
import PlatformIO from '-/services/platform-facade';
import { MilkdownEditor } from '@tagspaces/tagspaces-md';
import { renderCell } from '-/perspectives/common/main-container';
import { useTranslation } from 'react-i18next';
import GlobalSearch from '-/services/search-index';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import { useDirectoryContentContext } from '-/hooks/useDirectoryContentContext';
import { usePaginationContext } from '-/hooks/usePaginationContext';

interface Props {
  isMetaLoaded: boolean;
  //setIsMetaLoaded: (isLoaded: boolean) => void;
  style?: any;
  // gridRef: Object;
  directories: Array<TS.FileSystemEntry>;
  showDirectories: boolean;
  showDetails: boolean;
  showDescription: boolean;
  layoutType: string;
  showTags: boolean;
  desktopMode: boolean;
  currentDirectoryDescription: string;
  thumbnailMode: string;
  entrySize: string;
  files: Array<TS.FileSystemEntry>;
  // pageEntries: Array<TS.FileSystemEntry>;
  getCellContent: (
    fsEntry: TS.FileSystemEntry,
    selectedEntries: Array<TS.FileSystemEntry>,
    index: number,
    handleGridContextMenu,
    handleGridCellClick,
    handleGridCellDblClick,
    isLast?: boolean
  ) => void;
  currentDirectoryColor: string;
  currentDirectoryTags: Array<TS.Tag>;
  gridPageLimit: number;
  currentDirectoryPath: string;
  onContextMenu: (event: React.MouseEvent<HTMLDivElement>) => void;
  openRenameEntryDialog: () => void;
  onClick: (event: React.MouseEvent<HTMLDivElement>) => void;
  // eslint-disable-next-line react/no-unused-prop-types
  settings; // cache only
  // eslint-disable-next-line react/no-unused-prop-types
  selectedEntries; // cache only
  // setMetaForCurrentDir: (metaFiles: Array<any>) => void;
  lastBackgroundImageChange: any;
  lastThumbnailImageChange: any;
  setSelectedEntries: (selectedEntries: Array<TS.FileSystemEntry>) => void;
  singleClickAction: string;
  lastSelectedEntryPath: string;
  openFileNatively: (path?: string) => void;
  setFileContextMenuAnchorEl: (HTMLElement) => void;
  setDirContextMenuAnchorEl: (HTMLElement) => void;
  showNotification: (
    text: string,
    notificationType: string,
    autohide: boolean
  ) => void;
  moveFiles: (files: Array<string>, destination: string) => Promise<boolean>;
  clearSelection: () => void;
  lastSearchTimestamp: number;
}

function GridPagination(props: Props) {
  let { directories } = props;
  const { t } = useTranslation();
  const {
    style,
    showDirectories,
    showDetails,
    showDescription,
    showTags,
    singleClickAction,
    getCellContent,
    desktopMode,
    currentDirectoryColor,
    currentDirectoryTags,
    currentDirectoryDescription,
    currentDirectoryPath,
    lastThumbnailImageChange,
    openRenameEntryDialog,
    lastSelectedEntryPath,
    lastBackgroundImageChange,
    openFileNatively,
    setFileContextMenuAnchorEl,
    setDirContextMenuAnchorEl,
    showNotification,
    moveFiles,
    gridPageLimit,
    selectedEntries,
    setSelectedEntries,
    clearSelection,
    files,
    lastSearchTimestamp
  } = props;
  const { openEntry } = useOpenedEntryContext();
  const { isReadOnlyMode, currentLocation } = useCurrentLocationContext();
  const {
    currentDirectoryEntries,
    loadDirectoryContent
  } = useDirectoryContentContext();
  const { page, pageFiles, setCurrentPage } = usePaginationContext();
  const readOnlyMode = isReadOnlyMode();
  if (!showDirectories) {
    directories = [];
  }
  const theme = useTheme();
  const allFilesCount = files.length;
  const showPagination = gridPageLimit && files.length > gridPageLimit;
  const paginationCount = showPagination
    ? Math.ceil(allFilesCount / gridPageLimit)
    : 10;

  const containerEl = useRef(null);
  const folderTmbPath = useRef<string>(
    getFolderThumbPath(currentDirectoryPath, lastThumbnailImageChange)
  );
  const folderBgndPath = useRef<string>(
    getFolderBgndPath(currentDirectoryPath, lastBackgroundImageChange)
  );

  const [, forceUpdate] = useReducer(x => x + 1, 0);

  // TODO move in DirectoryContentContextProvider
  useEffect(() => {
    folderTmbPath.current = getFolderThumbPath(
      props.currentDirectoryPath,
      props.lastThumbnailImageChange
    );
    forceUpdate();
  }, [props.currentDirectoryPath, props.lastThumbnailImageChange]);

  useEffect(() => {
    folderBgndPath.current = getFolderBgndPath(
      props.currentDirectoryPath,
      props.lastBackgroundImageChange
    );
    forceUpdate();
  }, [props.currentDirectoryPath, props.lastBackgroundImageChange]);

  useEffect(() => {
    if (containerEl && containerEl.current) {
      containerEl.current.scrollTop = 0;
    }
  }, [
    //props.currentLocationPath,
    props.currentDirectoryPath,
    lastSearchTimestamp
  ]);

  const handleChange = (event, value) => {
    setCurrentPage(value).then(() => {
      if (containerEl && containerEl.current) {
        containerEl.current.scrollTop = 0;
      }
    });
  };

  const folderName = extractDirectoryName(
    props.currentDirectoryPath,
    PlatformIO.getDirSeparator()
  );

  const dirColor = currentDirectoryColor || 'transparent';

  let folderSummary =
    (directories.length > 0 ? directories.length + ' folder(s) and ' : '') +
    allFilesCount +
    ' file(s) found';
  if (selectedEntries && selectedEntries.length > 0) {
    folderSummary = selectedEntries.length + ' entries selected';
  }

  /* let descriptionHTML = '';
  if (showDescription && currentDirectoryDescription) {
    descriptionHTML = convertMarkDown(
      currentDirectoryDescription,
      props.currentDirectoryPath
    );
  }
  */

  return (
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-noninteractive-element-interactions,jsx-a11y/no-static-element-interactions
    <div
      style={{
        height: '100%',
        background: `${dirColor}`
      }}
    >
      <div
        ref={containerEl}
        onContextMenu={(event: React.MouseEvent<HTMLDivElement>) =>
          props.onContextMenu(event)
        }
        onClick={(event: React.MouseEvent<HTMLDivElement>) =>
          props.onClick(event)
        }
        style={{
          height: '100%',
          overflowY: 'auto',
          backgroundImage: 'url("' + folderBgndPath.current + '")',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat'
        }}
      >
        <Grid container spacing={2}>
          <Grid item xs={12} style={{ height: 70 }} />
          {showDetails && (
            <Grid item xs={12}>
              <div
                style={{
                  marginLeft: 10,
                  marginRight: 10,
                  marginTop: 0,
                  marginBottom: 0,
                  height:
                    !showDescription && currentDirectoryDescription ? 150 : 110,
                  position: 'relative'
                }}
              >
                {((folderName && folderName.length > 0) ||
                  (currentDirectoryTags &&
                    currentDirectoryTags.length > 0)) && (
                  <Box
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      overflow: 'auto',
                      padding: 10,
                      marginRight: 160,
                      width: 'fit-content',
                      background: theme.palette.background.default,
                      borderRadius: 8,
                      color: theme.palette.text.primary
                    }}
                  >
                    <Tooltip
                      data-tid={'currentDir_' + folderName}
                      title={t('core:renameDirectory')}
                    >
                      <ButtonBase
                        style={{ fontSize: '1.5rem' }}
                        onClick={() => {
                          setSelectedEntries([]);
                          openRenameEntryDialog();
                        }}
                      >
                        {folderName}
                      </ButtonBase>
                    </Tooltip>
                    {showTags ? (
                      <span style={{ paddingLeft: 5 }}>
                        {currentDirectoryTags &&
                          currentDirectoryTags.map((tag: TS.Tag) => {
                            return <TagContainer tag={tag} tagMode="display" />;
                          })}
                      </span>
                    ) : (
                      <TagsPreview tags={currentDirectoryTags} />
                    )}
                  </Box>
                )}
                <Box
                  style={{
                    paddingBottom: 5,
                    background: theme.palette.background.default,
                    marginTop: 10,
                    marginRight: 160,
                    padding: 10,
                    borderRadius: 10,
                    width: 'fit-content',
                    color: theme.palette.text.primary
                  }}
                >
                  <Typography
                    style={{
                      fontSize: '0.9rem'
                    }}
                  >
                    {folderSummary}
                  </Typography>
                  {!showDescription && currentDirectoryDescription && (
                    <Typography
                      style={{
                        fontSize: '0.8rem',
                        wordBreak: 'break-all',
                        height: 45,
                        overflowY: 'auto'
                      }}
                    >
                      {getDescriptionPreview(currentDirectoryDescription, 200)}
                    </Typography>
                  )}
                </Box>
                {/* <Tooltip title={t('core:thumbnail')}> */}
                <div
                  style={{
                    borderRadius: 10,
                    height: 100,
                    width: 140,
                    backgroundImage: 'url("' + folderTmbPath.current + '")',
                    backgroundSize: 'cover', // cover contain
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'center center',
                    position: 'absolute',
                    top: 0,
                    right: 0
                  }}
                ></div>
                {/* </Tooltip> */}
              </div>
            </Grid>
          )}
          {showDescription && currentDirectoryDescription && (
            <Grid
              item
              xs={12}
              style={{
                backgroundColor: theme.palette.background.default,
                marginTop: showDetails ? 0 : 10,
                marginLeft: 25,
                marginRight: 10,
                padding: 10,
                borderRadius: 10
              }}
            >
              <MilkdownEditor
                content={currentDirectoryDescription}
                readOnly={true}
                dark={theme.palette.mode === 'dark'}
                currentFolder={currentDirectoryPath}
                lightMode={true}
              />
            </Grid>
          )}
        </Grid>
        <div style={style} data-tid="perspectiveGridFileTable">
          {page === 1 &&
            directories.map((entry, index) =>
              renderCell(
                entry,
                index,
                getCellContent,
                showDirectories,
                readOnlyMode,
                desktopMode,
                singleClickAction,
                currentLocation,
                selectedEntries,
                setSelectedEntries,
                lastSelectedEntryPath,
                lastSearchTimestamp
                  ? GlobalSearch.getInstance().getResults()
                  : currentDirectoryEntries,
                openEntry,
                openFileNatively,
                loadDirectoryContent,
                setFileContextMenuAnchorEl,
                setDirContextMenuAnchorEl,
                showNotification,
                moveFiles,
                clearSelection
              )
            )}
          {pageFiles.map((entry, index, dArray) =>
            renderCell(
              entry,
              index,
              getCellContent,
              showDirectories,
              readOnlyMode,
              desktopMode,
              singleClickAction,
              currentLocation,
              selectedEntries,
              setSelectedEntries,
              lastSelectedEntryPath,
              lastSearchTimestamp
                ? GlobalSearch.getInstance().getResults()
                : currentDirectoryEntries,
              openEntry,
              openFileNatively,
              loadDirectoryContent,
              setFileContextMenuAnchorEl,
              setDirContextMenuAnchorEl,
              showNotification,
              moveFiles,
              clearSelection,
              index === dArray.length - 1
            )
          )}
          {pageFiles.length < 1 && directories.length < 1 && (
            <div style={{ textAlign: 'center' }}>
              {!showDescription && currentDirectoryDescription && (
                <div style={{ position: 'relative', marginBottom: 150 }}>
                  <EntryIcon isFile={false} />
                </div>
              )}
              <Typography
                style={{ padding: 15, color: theme.palette.text.secondary }}
              >
                {t('core:noFileFolderFound')}
              </Typography>
              {!AppConfig.isCordova && (
                <Typography style={{ color: theme.palette.text.secondary }}>
                  {t('core:dragAndDropToImport')}
                </Typography>
              )}
            </div>
          )}
          {pageFiles.length < 1 && directories.length >= 1 && !showDirectories && (
            <div style={{ textAlign: 'center' }}>
              {!showDescription && currentDirectoryDescription && (
                <div style={{ position: 'relative', marginBottom: 150 }}>
                  <EntryIcon isFile={false} />
                </div>
              )}
              <Typography
                style={{ padding: 15, color: theme.palette.text.secondary }}
              >
                {t('core:noFileButFoldersFound')}
              </Typography>
              {!AppConfig.isCordova && (
                <Typography style={{ color: theme.palette.text.secondary }}>
                  {t('core:dragAndDropToImport')}
                </Typography>
              )}
            </div>
          )}
        </div>
        {showPagination && (
          <Tooltip title={folderSummary}>
            <Pagination
              style={{
                left: 15,
                bottom: 15,
                zIndex: 1100,
                position: 'absolute',
                backgroundColor: theme.palette.background.default,
                opacity: 0.97,
                border: '1px solid lightgray',
                borderRadius: 5,
                padding: 3
              }}
              count={paginationCount}
              page={page}
              onChange={handleChange}
            />
          </Tooltip>
        )}
        {!showDetails &&
          !showPagination &&
          (directories.length > 0 || pageFiles.length > 0) && (
            <div style={{ padding: 15, bottom: 10 }}>
              <Typography
                style={{
                  fontSize: '0.9rem',
                  color: theme.palette.text.primary
                }}
              >
                {folderSummary}
              </Typography>
            </div>
          )}
      </div>
    </div>
  );
}

function mapStateToProps(state) {
  return {
    currentDirectoryColor: getCurrentDirectoryColor(state),
    lastSearchTimestamp: getLastSearchTimestamp(state),
    currentDirectoryTags: getCurrentDirectoryTags(state),
    isMetaLoaded: getIsMetaLoaded(state),
    currentDirectoryDescription: getCurrentDirectoryDescription(state),
    lastBackgroundImageChange: getLastBackgroundImageChange(state),
    lastThumbnailImageChange: getLastThumbnailImageChange(state),
    lastSelectedEntryPath: getLastSelectedEntryPath(state)
  };
}

const areEqual = (prevProp: Props, nextProp: Props) =>
  //  nextProp.theme === prevProp.theme &&
  JSON.stringify(nextProp.lastBackgroundImageChange) ===
    JSON.stringify(prevProp.lastBackgroundImageChange) &&
  JSON.stringify(nextProp.lastThumbnailImageChange) ===
    JSON.stringify(prevProp.lastThumbnailImageChange) &&
  nextProp.currentDirectoryPath === prevProp.currentDirectoryPath &&
  nextProp.isMetaLoaded === prevProp.isMetaLoaded &&
  nextProp.showDirectories === prevProp.showDirectories &&
  nextProp.showDetails === prevProp.showDetails &&
  nextProp.showDescription === prevProp.showDescription &&
  nextProp.showTags === prevProp.showTags &&
  nextProp.thumbnailMode === prevProp.thumbnailMode &&
  nextProp.entrySize === prevProp.entrySize &&
  nextProp.gridPageLimit === prevProp.gridPageLimit &&
  nextProp.lastSearchTimestamp === prevProp.lastSearchTimestamp &&
  nextProp.currentDirectoryDescription ===
    prevProp.currentDirectoryDescription &&
  JSON.stringify(nextProp.files) === JSON.stringify(prevProp.files) &&
  JSON.stringify(nextProp.directories) ===
    JSON.stringify(prevProp.directories) &&
  JSON.stringify(nextProp.settings) === JSON.stringify(prevProp.settings) &&
  JSON.stringify(nextProp.selectedEntries) ===
    JSON.stringify(prevProp.selectedEntries) &&
  JSON.stringify(nextProp.currentDirectoryColor) ===
    JSON.stringify(prevProp.currentDirectoryColor);

export default connect(mapStateToProps)(React.memo(GridPagination, areEqual));
