import { Detabase, DetabaseKV } from "../mod.ts";
import {
	assertEquals,
	assertRejects,
} from "https://deno.land/std@0.129.0/testing/asserts.ts";

Deno.test("Detabase", async () => {
	const db = new Detabase<{
		key: string;
		value: string;
	}>({
		apikey: Deno.env.get("DETABASE_APIKEY")!,
		projectId: Deno.env.get("DETABASE_PROJECTID")!,
		baseName: Deno.env.get("DETABASE_BASENAME")!,
	});

	await db.put([{
		key: "foo",
		value: "bar",
	}]);
	const data = await db.get("foo");
	assertEquals(data, {
		key: "foo",
		value: "bar",
	});
	await db.delete("foo");
	await assertRejects(() => {
		return db.get("foo").catch(async (e) => {
			await e.response.arrayBuffer();
			throw e;
		});
	});
});

Deno.test("DetabaseKV", async () => {
	const db = new DetabaseKV<string>({
		apikey: Deno.env.get("DETABASE_APIKEY")!,
		projectId: Deno.env.get("DETABASE_PROJECTID")!,
		baseName: Deno.env.get("DETABASE_BASENAME")!,
	});

	await db.set("foo", "bar");
	const data = await db.get("foo");
	assertEquals(data, "bar");
	await db.delete("foo");
	const nil = await db.get("foo");
	assertEquals(nil, null);
});
