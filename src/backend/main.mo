import Map "mo:core/Map";
import Array "mo:core/Array";
import List "mo:core/List";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";

actor {
  // Type aliases
  type Json = Text;
  type Symbol = Text;
  type PreferenceKey = Text;
  type PreferenceValue = Text;

  // Persistent storage
  let watchlist = List.empty<Text>();
  let preferences = Map.empty<PreferenceKey, PreferenceValue>();
  let executionStateSnapshots = Map.empty<Symbol, Json>();
  var userPreferences : Json = "{}";

  // Watchlist management
  public query ({ caller }) func getWatchlist() : async [Symbol] {
    watchlist.toArray();
  };

  public shared ({ caller }) func addToWatchlist(symbol : Symbol) : async () {
    if (watchlist.contains(symbol)) {
      Runtime.trap("Symbol already in watchlist");
    };
    watchlist.add(symbol);
  };

  public shared ({ caller }) func removeFromWatchlist(symbol : Symbol) : async () {
    let filtered = watchlist.values().toArray().filter(func(s) { s != symbol });
    watchlist.clear();
    watchlist.addAll(filtered.values());
  };

  public shared ({ caller }) func clearWatchlist() : async () {
    watchlist.clear();
  };

  // Preferences persistence
  public query ({ caller }) func getPreference(key : PreferenceKey) : async PreferenceValue {
    switch (preferences.get(key)) {
      case (null) { Runtime.trap("Preference not found") };
      case (?value) { value };
    };
  };

  public shared ({ caller }) func setPreference(key : PreferenceKey, value : PreferenceValue) : async () {
    preferences.add(key, value);
  };

  public query ({ caller }) func getAllPreferences() : async [(PreferenceKey, PreferenceValue)] {
    preferences.toArray();
  };

  public shared ({ caller }) func clearPreferences() : async () {
    preferences.clear();
  };

  // Execution state snapshots
  public query ({ caller }) func getExecutionStateSnapshot(symbol : Symbol) : async Json {
    switch (executionStateSnapshots.get(symbol)) {
      case (null) { Runtime.trap("Execution state snapshot not found") };
      case (?snapshot) { snapshot };
    };
  };

  public shared ({ caller }) func saveExecutionStateSnapshot(symbol : Symbol, snapshot : Json) : async () {
    executionStateSnapshots.add(symbol, snapshot);
  };

  public shared ({ caller }) func removeExecutionStateSnapshot(symbol : Symbol) : async () {
    executionStateSnapshots.remove(symbol);
  };

  // User preferences
  public query ({ caller }) func getUserPreferences() : async Json {
    userPreferences;
  };

  public shared ({ caller }) func saveUserPreferences(preferences : Json) : async () {
    userPreferences := preferences;
  };
};
