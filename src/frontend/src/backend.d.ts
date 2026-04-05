import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type PreferenceValue = string;
export type Json = string;
export type Symbol = string;
export type PreferenceKey = string;
export interface backendInterface {
    addToWatchlist(symbol: Symbol): Promise<void>;
    clearPreferences(): Promise<void>;
    clearWatchlist(): Promise<void>;
    getAllPreferences(): Promise<Array<[PreferenceKey, PreferenceValue]>>;
    getExecutionStateSnapshot(symbol: Symbol): Promise<Json>;
    getPreference(key: PreferenceKey): Promise<PreferenceValue>;
    getUserPreferences(): Promise<Json>;
    getWatchlist(): Promise<Array<Symbol>>;
    removeExecutionStateSnapshot(symbol: Symbol): Promise<void>;
    removeFromWatchlist(symbol: Symbol): Promise<void>;
    saveExecutionStateSnapshot(symbol: Symbol, snapshot: Json): Promise<void>;
    saveUserPreferences(preferences: Json): Promise<void>;
    setPreference(key: PreferenceKey, value: PreferenceValue): Promise<void>;
}
