import * as React from                                                 'react';
import IVerticalProps from                                              './IVerticalProps';
import IVerticalState from                                              './IVerticalState';
import { Checkbox } from                                               'office-ui-fabric-react/lib/Checkbox';
import { Text } from                                                   '@microsoft/sp-core-library';
import * as update from                                                'immutability-helper';
import {
    GroupedList,
    IGroup,
    IGroupDividerProps
} from                                                                 'office-ui-fabric-react/lib/components/GroupedList/index';
import {Link} from 'office-ui-fabric-react';
import styles from './Vertical.module.scss';
import * as strings from 'SearchRefinersWebPartStrings';
import { IRefinementValue, IRefinementFilter } from '../../../../../models/ISearchResult';

export default class Vertical extends React.Component<IVerticalProps, IVerticalState> {

    public constructor(props: IVerticalProps) {
        super(props);

        this.state = {
            expandedGroups: [],
            selectedFilters: []
        };

        this._addFilter = this._addFilter.bind(this);
        this._removeFilter = this._removeFilter.bind(this);
        this._isInFilterSelection = this._isInFilterSelection.bind(this);
        this._removeAllFilters = this._removeAllFilters.bind(this);
        this._onRenderHeader = this._onRenderHeader.bind(this);
        this._onRenderCell = this._onRenderCell.bind(this);
    }

    public componentDidMount() {
        this.setState({
            selectedFilters: []
        });
    }

    public componentWillReceiveProps(nextProps: IVerticalProps) {

        if (nextProps.resetSelectedFilters) {
            // Reset the selected filter on new query
            this.setState({
                selectedFilters: []
            });
        }
    }

    public render(): React.ReactElement<IVerticalProps> {

        let items: JSX.Element[] = [];
        let groups: IGroup[] = [];
        let noResultsElement: JSX.Element;

        // Initialize the Office UI grouped list
        this.props.availableFilters.map((filter, i) => {

            // Get group name
            let groupName = filter.FilterName;
            const configuredFilter = this.props.refinersConfiguration.filter(e => { return e.refinerName === filter.FilterName;});
            groupName = configuredFilter.length > 0 && configuredFilter[0].displayValue ? configuredFilter[0].displayValue : groupName;

            groups.push({
                key: i.toString(),
                name: groupName,
                count: 1,
                startIndex: i,
                isDropEnabled: true,
                isCollapsed: this.state.expandedGroups.indexOf(i) === -1 ? true : false,
            });

            items.push(
                <div key={i}>
                        {
                            filter.Values.map((refinementValue: IRefinementValue, j) => {

                                // Create a new IRefinementFilter with only the current refinement information
                                const currentRefinement: IRefinementFilter = {
                                    FilterName: filter.FilterName,
                                    Value: refinementValue,
                                };

                                return (
                                    <Checkbox
                                        key={j}
                                        checked={this._isInFilterSelection(currentRefinement)}
                                        disabled={false}
                                        label={Text.format(refinementValue.RefinementValue + ' ({0})', refinementValue.RefinementCount)}
                                        onChange={(ev, checked: boolean) => {
                                            // Every time we chek/uncheck a filter, a complete new search request is performed with current selected refiners
                                            checked ? this._addFilter(currentRefinement) : this._removeFilter(currentRefinement);
                                        }} />
                                );
                            })
                        }
                </div>
            );
        });

        const renderAvailableFilters = (this.props.availableFilters.length > 0) ? <GroupedList
            ref='groupedList'
            items={items}
            onRenderCell={this._onRenderCell}
            className={styles.verticalLayout__filterPanel__body__group}
            groupProps={
                {
                    onRenderHeader: this._onRenderHeader,
                }
            }
            groups={groups} /> : noResultsElement;

        const renderLinkRemoveAll = this.state.selectedFilters.length > 0 ?
                                    (<div className={`${styles.verticalLayout__filterPanel__body__removeAllFilters} ${this.state.selectedFilters.length === 0 && "hiddenLink"}`}>
                                            <Link onClick={this._removeAllFilters}>
                                                {strings.RemoveAllFiltersLabel}
                                            </Link>
                                    </div>) : null;

        return (
                <div className={styles.verticalLayout__filterPanel__body}>
                    {renderAvailableFilters}
                    {renderLinkRemoveAll}
                </div>
        );
    }

    private _onRenderCell(nestingDepth: number, item: any, itemIndex: number) {
        return (
            <div className={styles.verticalLayout__filterPanel__body__group__item} data-selection-index={itemIndex}>
                {item}
            </div>
        );
    }

    private _onRenderHeader(props: IGroupDividerProps): JSX.Element {

        return (
            <div className={ styles.verticalLayout__filterPanel__body__group__header }
                style={props.groupIndex > 0 ? { marginTop: '10px' } : undefined }
                onClick={() => {

                    // Update the index for expanded groups to be able to keep it open after a re-render
                    const updatedExpandedGroups =
                        props.group.isCollapsed ?
                            update(this.state.expandedGroups, { $push: [props.group.startIndex] }) :
                            update(this.state.expandedGroups, { $splice: [[this.state.expandedGroups.indexOf(props.group.startIndex), 1]] });

                    this.setState({
                        expandedGroups: updatedExpandedGroups,
                    });

                    props.onToggleCollapse(props.group);
                }}>
                <div className={styles.verticalLayout__filterPanel__body__headerIcon}>
                    <i className={props.group.isCollapsed ? 'ms-Icon ms-Icon--ChevronDown' : 'ms-Icon ms-Icon--ChevronUp'}></i>
                </div>
                <div className='ms-font-l'>{props.group.name}</div>
            </div>
        );
    }

    private _addFilter(filterToAdd: IRefinementFilter): void {

        // Add the filter to the selected filters collection
        let newFilters = update(this.state.selectedFilters, {$push: [filterToAdd]});

        this._applyFilters(newFilters);
    }

    private _removeFilter(filterToRemove: IRefinementFilter): void {

        // Remove the filter from the selected filters collection
        let newFilters = this.state.selectedFilters.filter((elt) => {
            return elt.Value.RefinementToken !== filterToRemove.Value.RefinementToken;
        });

        this._applyFilters(newFilters);
    }

    private _removeAllFilters(): void {
        this._applyFilters([]);
    }

    /**
     * Inner method to effectivly apply the refiners by calling back the parent component
     * @param selectedFilters The filters to apply
     */
    private _applyFilters(selectedFilters: IRefinementFilter[]): void {
        this.setState({
            selectedFilters: selectedFilters
        });

        this.props.onUpdateFilters(selectedFilters);
    }

    /**
     * Checks if the current filter is present in the list of the selected filters
     * @param filterToCheck The filter to check
     */
    private _isInFilterSelection(filterToCheck: IRefinementFilter): boolean {

        let newFilters = this.state.selectedFilters.filter((filter) => {
            return filter.Value.RefinementToken === filterToCheck.Value.RefinementToken;
        });

        return newFilters.length === 0 ? false : true;
    }
}