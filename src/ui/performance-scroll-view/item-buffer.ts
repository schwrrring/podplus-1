import { PerformanceScrollView } from "./performance-scroll-view";

export interface ItemBufferProperties {
    numberOfItems: number;
    itemBufferSize: number;
    itemGenerator: (indexes: number[]) => JSX.Element[] | Promise<JSX.Element[]>;
    loadingMoreIndicator?: JSX.Element;
}

export interface ItemBufferState {
    currentBufferOffset: number;
}

// export function createItemBuffer(offset: number, props: ItemBufferProperties) {
//     let items: JSX.Element[] = [];

//     let start = offset;
//     let end = Math.min(offset + props.itemBufferSize, props.numberOfItems);

//     for (let i = start; i < end; i++) {
//         items.push(props.itemGenerator(i));
//     }

//     return items;
// }

export class ItemBuffer {
    // target: PerformanceScrollView;
    elementCache = new Map<number, JSX.Element>();

    constructor(target: PerformanceScrollView) {
        // this.target = target;
    }

    async load(props: ItemBufferProperties, state: ItemBufferState): Promise<JSX.Element[]> {
        // If the total number of items is below our buffer size, we create a
        // smaller buffer.
        let bufferSize = Math.min(props.itemBufferSize, props.numberOfItems);
        let startIndex = state.currentBufferOffset;

        startIndex = Math.max(startIndex, 0);

        let endIndex = startIndex + bufferSize;

        endIndex = Math.min(endIndex, props.numberOfItems);

        let startLoadingIndicator: JSX.Element | undefined = undefined;
        let endLoadingIndicator: JSX.Element | undefined = undefined;

        if (startIndex > 0 && props.loadingMoreIndicator) {
            // If the start index is above zero then rather than display the first item,
            // we insert our loading more indicator below.
            startIndex++;
            startLoadingIndicator = props.loadingMoreIndicator;
        }
        if (endIndex < props.numberOfItems && props.loadingMoreIndicator) {
            endIndex--;
            endLoadingIndicator = props.loadingMoreIndicator;
        }

        let items = await this.fetchItems(startIndex, endIndex, props);

        if (startLoadingIndicator) {
            console.info("BUFFER: Adding 'loading more' indicator to the top");
            items.unshift(startLoadingIndicator);
        }
        if (endLoadingIndicator) {
            console.info("BUFFER: Adding 'loading more' indicator to the bottom");
            items.push(endLoadingIndicator);
        }
        return items;
    }

    async fetchItems(startIndex: number, endIndex: number, props: ItemBufferProperties): Promise<JSX.Element[]> {
        let indexesToFetch: number[] = [];
        let results = new Map<number, JSX.Element>();

        console.info(
            `ITEM BUFFER: Fetching items from ${startIndex} to ${endIndex}, out of ${props.numberOfItems} total items`
        );

        for (let index = startIndex; index < endIndex; index++) {
            let result = this.elementCache.get(index);
            if (!result) {
                indexesToFetch.push(index);
            } else {
                results.set(index, result);
            }
        }

        if (indexesToFetch.length === 0) {
            console.info(`ITEM BUFFER: Returning ${results.size} cached items.`);
            return this.transformMapToOrderedElementArray(results);
        }

        console.info(`ITEM BUFFER: Fetching ${indexesToFetch.length} new items`);

        let fetchedResults = await Promise.resolve(props.itemGenerator(indexesToFetch));

        indexesToFetch.forEach((key, arrayIndex) => {
            let newResult = fetchedResults[arrayIndex];
            if (!newResult) {
                throw new Error("Could not get item for index" + key);
            }

            this.elementCache.set(key, newResult);
            results.set(key, newResult);
        });

        console.info(
            `ITEM BUFFER: Returning ${results.size - indexesToFetch.length} cached items, ${
                indexesToFetch.length
            } new items`
        );
        return this.transformMapToOrderedElementArray(results);
    }

    transformMapToOrderedElementArray(map: Map<number, JSX.Element>): JSX.Element[] {
        let keys = Array.from(map.keys()).sort((a, b) => a - b);
        return keys.map(key => map.get(key)!);
    }
}
