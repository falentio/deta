export interface DetabaseOptions {
	projectId: string;
	baseName: string;
	apikey: string;
}

export type JSONPrimitiveValue =
	| number
	| string
	| null
	| boolean;

export type JSONValue =
	| { [k: string]: JSONValue }
	| JSONValue[]
	| JSONPrimitiveValue;

export interface DetabaseUpdateQuery {
	set?: Record<string, JSONPrimitiveValue>;
	increment?: Record<string, number>;
	append?: Record<string, JSONPrimitiveValue[]>;
	delete?: string[];
}

export interface DetabaseQuery {
	query?:
		| { [k: string]: JSONValue }
		| JSONValue[];
	limit?: number;
	last?: string;
}

export class DetabaseError extends Error {
	response!: Response;
	errors!: string[]
}

declare namespace DetabaseResponse {
	export interface Put<T> {
		processed: { items: T[] };
		failed: { items: T[] };
	}

	export interface Delete {
		key: string;
	}

	export interface Update {
		key: string;
		set: Record<string, JSONPrimitiveValue>;
		delete: string[];
	}

	export interface Query<T> {
		paging: {
			size: number;
			last: string;
		};
		items: T[];
	}
}

export type { DetabaseResponse };

// deno-lint-ignore no-explicit-any
export class Detabase<T extends Record<string, any>> {
	baseUrl: string;
	#apikey: string;

	constructor({ projectId, baseName, apikey }: DetabaseOptions) {
		this.baseUrl = `https://database.deta.sh/v1/${projectId}/${baseName}`;
		this.#apikey = apikey;
	}
	// deno-lint-ignore no-explicit-any
	#request(path: string, method?: string, body?: Record<string, any>) {
		const url = new URL(path, this.baseUrl).href;
		const init: RequestInit = {
			method,
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": this.#apikey,
			},
		};
		if (body) {
			init.body = JSON.stringify(body);
		}
		return fetch(url, init)
			.then(async(res) => {
				if (res.ok) {
					return res.json();
				}
				const err = new DetabaseError(
					"non 2xx http status code received",
				);
				err.response = res;
				const json = await res.json()
				err.errors = json.errors
				throw err;
			});
	}
	/**
	 * Store multiple items in a single request.
	 * This request overwrites an item if `key` already exists.
	 */
	put(items: T[]): Promise<DetabaseResponse.Put<T>> {
		return this.#request("items", "PUT", { items });
	}

	/** Get a stored items */
	get(name: string): Promise<T> {
		name = encodeURIComponent(name);
		return this.#request(`items/${name}`);
	}

	/**
	 * Delete a stored items.
	 * This always return `key` as response, regardless `key` is existed or not
	 */
	delete(name: string): Promise<DetabaseResponse.Delete> {
		name = encodeURIComponent(name);
		return this.#request(`items/${name}`, "DELETE");
	}

	/** Create new item only if no item with same `key` exists */
	insert(item: T): Promise<T> {
		return this.#request("items", "POST", { item });
	}

	/** Updates an item only if an item with `key` exists */
	update(
		name: string,
		query: DetabaseUpdateQuery,
	): Promise<DetabaseResponse.Update> {
		name = encodeURIComponent(name);
		return this.#request(`items/${name}`, "PATCH", query);
	}

	/**
	 * List item that match query
	 * Upto 1 MB data retreived before filtering with query
	 */
	query(query: DetabaseQuery): Promise<DetabaseResponse.Query<T>> {
		return this.#request("quert", "POST", query);
	}
}