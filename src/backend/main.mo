import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";



actor {
  // Initialize the access control state
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User profile type and storage
  public type UserProfile = {
    name : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  type MilkRecord = {
    id : Nat;
    date : Text;
    morningQuantity : Float;
    morningFat : Float;
    morningAmount : Float;
    eveningQuantity : Float;
    eveningFat : Float;
    eveningAmount : Float;
  };

  type Expense = {
    id : Nat;
    date : Text;
    description : Text;
    amount : Float;
    category : Text;
    status : Text;
  };

  type StaffMember = {
    id : Nat;
    name : Text;
    role : Text;
    monthlySalary : Float;
    totalAdvancePaid : Float;
  };

  type AdvancePayment = {
    id : Nat;
    staffId : Nat;
    date : Text;
    amount : Float;
    note : Text;
  };

  let milkRecords = Map.empty<Nat, MilkRecord>();
  var nextMilkRecordId = 0;

  let expenses = Map.empty<Nat, Expense>();
  var nextExpenseId = 0;

  let staffMembers = Map.empty<Nat, StaffMember>();
  var nextStaffMemberId = 0;

  let advancePayments = Map.empty<Nat, AdvancePayment>();
  var nextAdvancePaymentId = 0;

  // MilkRecord operations - require user role
  public shared ({ caller }) func addMilkRecord(
    date : Text,
    morningQuantity : Float,
    morningFat : Float,
    morningAmount : Float,
    eveningQuantity : Float,
    eveningFat : Float,
    eveningAmount : Float,
  ) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add milk records");
    };

    let id = nextMilkRecordId;
    nextMilkRecordId += 1;

    let milkRecord : MilkRecord = {
      id;
      date;
      morningQuantity;
      morningFat;
      morningAmount;
      eveningQuantity;
      eveningFat;
      eveningAmount;
    };

    milkRecords.add(id, milkRecord);
    id;
  };

  public shared ({ caller }) func updateMilkRecord(
    id : Nat,
    date : Text,
    morningQuantity : Float,
    morningFat : Float,
    morningAmount : Float,
    eveningQuantity : Float,
    eveningFat : Float,
    eveningAmount : Float,
  ) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update milk records");
    };

    switch (milkRecords.get(id)) {
      case (null) { Runtime.trap("Milk record not found") };
      case (?_) {
        let updatedRecord : MilkRecord = {
          id;
          date;
          morningQuantity;
          morningFat;
          morningAmount;
          eveningQuantity;
          eveningFat;
          eveningAmount;
        };
        milkRecords.add(id, updatedRecord);
      };
    };
  };

  public shared ({ caller }) func deleteMilkRecord(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete milk records");
    };

    switch (milkRecords.get(id)) {
      case (null) { Runtime.trap("Milk record not found") };
      case (?_) {
        milkRecords.remove(id);
      };
    };
  };

  public query ({ caller }) func getMilkRecords() : async [MilkRecord] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view milk records");
    };
    milkRecords.values().toArray();
  };

  // Expense operations - require admin role (financial data)
  public shared ({ caller }) func addExpense(date : Text, description : Text, amount : Float, category : Text, status : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add expenses");
    };

    let id = nextExpenseId;
    nextExpenseId += 1;

    let expense : Expense = {
      id;
      date;
      description;
      amount;
      category;
      status;
    };

    expenses.add(id, expense);
    id;
  };

  public shared ({ caller }) func updateExpense(id : Nat, date : Text, description : Text, amount : Float, category : Text, status : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update expenses");
    };

    switch (expenses.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?_) {
        let updatedExpense : Expense = {
          id;
          date;
          description;
          amount;
          category;
          status;
        };
        expenses.add(id, updatedExpense);
      };
    };
  };

  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete expenses");
    };

    switch (expenses.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?_) {
        expenses.remove(id);
      };
    };
  };

  public query ({ caller }) func getExpenses() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view expenses");
    };
    expenses.values().toArray();
  };

  public shared ({ caller }) func markExpensePaid(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can mark expenses as paid");
    };

    switch (expenses.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?expense) {
        let updatedExpense : Expense = {
          id = expense.id;
          date = expense.date;
          description = expense.description;
          amount = expense.amount;
          category = expense.category;
          status = "paid";
        };
        expenses.add(id, updatedExpense);
      };
    };
  };

  // StaffMember operations - require admin role (sensitive HR data)
  public shared ({ caller }) func addStaffMember(name : Text, role : Text, monthlySalary : Float) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add staff members");
    };

    let id = nextStaffMemberId;
    nextStaffMemberId += 1;

    let staffMember : StaffMember = {
      id;
      name;
      role;
      monthlySalary;
      totalAdvancePaid = 0.0;
    };

    staffMembers.add(id, staffMember);
    id;
  };

  public shared ({ caller }) func updateStaffMember(id : Nat, name : Text, role : Text, monthlySalary : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update staff members");
    };

    switch (staffMembers.get(id)) {
      case (null) { Runtime.trap("Staff member not found") };
      case (?staff) {
        let updatedStaff : StaffMember = {
          id;
          name;
          role;
          monthlySalary;
          totalAdvancePaid = staff.totalAdvancePaid;
        };
        staffMembers.add(id, updatedStaff);
      };
    };
  };

  public shared ({ caller }) func deleteStaffMember(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete staff members");
    };

    switch (staffMembers.get(id)) {
      case (null) { Runtime.trap("Staff member not found") };
      case (?_) {
        staffMembers.remove(id);
      };
    };
  };

  public query ({ caller }) func getStaffMembers() : async [StaffMember] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view staff members");
    };
    staffMembers.values().toArray();
  };

  // AdvancePayment operations - require admin role (financial data)
  public shared ({ caller }) func addAdvancePayment(staffId : Nat, date : Text, amount : Float, note : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can add advance payments");
    };

    // Check if staff member exists
    switch (staffMembers.get(staffId)) {
      case (null) { Runtime.trap("Staff member not found") };
      case (?_) {
        let id = nextAdvancePaymentId;
        nextAdvancePaymentId += 1;

        let advancePayment : AdvancePayment = {
          id;
          staffId;
          date;
          amount;
          note;
        };

        // Add advance payment
        advancePayments.add(id, advancePayment);

        // Update totalAdvancePaid in staff member
        updateTotalAdvancePaid(staffId);

        id;
      };
    };
  };

  public shared ({ caller }) func deleteAdvancePayment(id : Nat) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete advance payments");
    };

    switch (advancePayments.get(id)) {
      case (null) { Runtime.trap("Advance payment not found") };
      case (?payment) {
        let staffId = payment.staffId;
        // Remove advance payment
        advancePayments.remove(id);
        // Update totalAdvancePaid in staff member
        updateTotalAdvancePaid(staffId);
      };
    };
  };

  public query ({ caller }) func getAdvancePayments() : async [AdvancePayment] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view advance payments");
    };
    advancePayments.values().toArray();
  };

  func updateTotalAdvancePaid(staffId : Nat) : () {
    let payments = advancePayments.values().toArray();
    let staffTotalAdvance = payments.foldLeft(
      0.0,
      func(acc, p) {
        if (p.staffId == staffId) { acc + p.amount } else {
          acc;
        };
      },
    );

    switch (staffMembers.get(staffId)) {
      case (null) { () }; // Do nothing if staff member not found
      case (?staff) {
        let updatedStaff : StaffMember = {
          id = staff.id;
          name = staff.name;
          role = staff.role;
          monthlySalary = staff.monthlySalary;
          totalAdvancePaid = staffTotalAdvance;
        };
        staffMembers.add(staffId, updatedStaff);
      };
    };
  };
};
