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
    authCheck(caller, "Unauthorized: Must be authenticated");
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
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

  type BuyerAdvancePayment = {
    id : Nat;
    date : Text;
    amount : Float;
    reason : Text;
  };

  type Animal = {
    id : Nat;
    serialNumber : Text;
    animalType : Text;
    name : Text;
    semenDate : Text;
    notes : Text;
  };

  let milkRecords = Map.empty<Nat, MilkRecord>();
  var nextMilkRecordId = 0;

  let expenses = Map.empty<Nat, Expense>();
  var nextExpenseId = 0;

  let staffMembers = Map.empty<Nat, StaffMember>();
  var nextStaffMemberId = 0;

  let advancePayments = Map.empty<Nat, AdvancePayment>();
  var nextAdvancePaymentId = 0;

  let buyerAdvancePayments = Map.empty<Nat, BuyerAdvancePayment>();
  var nextBuyerAdvancePaymentId = 0;

  let animals = Map.empty<Nat, Animal>();
  var nextAnimalId = 0;

  //---------------------------------------------------------------------------
  // Helper function for authentication check (non-anonymous)
  //---------------------------------------------------------------------------
  func authCheck(principal : Principal, errorMsg : Text) : () {
    if (principal.isAnonymous()) {
      Runtime.trap(errorMsg);
    };
  };

  func findMilkRecord(id : Nat) : MilkRecord {
    switch (milkRecords.get(id)) {
      case (null) { Runtime.trap("Milk record not found") };
      case (?record) { record };
    };
  };

  func findExpense(id : Nat) : Expense {
    switch (expenses.get(id)) {
      case (null) { Runtime.trap("Expense not found") };
      case (?expense) { expense };
    };
  };

  func findStaffMember(id : Nat) : StaffMember {
    switch (staffMembers.get(id)) {
      case (null) { Runtime.trap("Staff member not found") };
      case (?staff) { staff };
    };
  };

  func findAdvancePayment(id : Nat) : AdvancePayment {
    switch (advancePayments.get(id)) {
      case (null) { Runtime.trap("Advance payment not found") };
      case (?payment) { payment };
    };
  };

  func findBuyerAdvancePayment(id : Nat) : BuyerAdvancePayment {
    switch (buyerAdvancePayments.get(id)) {
      case (null) { Runtime.trap("Buyer advance payment not found") };
      case (?payment) { payment };
    };
  };

  func findAnimal(id : Nat) : Animal {
    switch (animals.get(id)) {
      case (null) { Runtime.trap("Animal not found") };
      case (?animal) { animal };
    };
  };

  //---------------------------------------------------------------------------
  // MilkRecord operations - require non-anonymous access
  //---------------------------------------------------------------------------
  public shared ({ caller }) func addMilkRecord(
    date : Text,
    morningQuantity : Float,
    morningFat : Float,
    morningAmount : Float,
    eveningQuantity : Float,
    eveningFat : Float,
    eveningAmount : Float,
  ) : async Nat {
    authCheck(caller, "Unauthorized: Must be authenticated");

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
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findMilkRecord(id);

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

  public shared ({ caller }) func deleteMilkRecord(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findMilkRecord(id);

    milkRecords.remove(id);
  };

  public query ({ caller }) func getMilkRecords() : async [MilkRecord] {
    authCheck(caller, "Unauthorized: Must be authenticated");
    milkRecords.values().toArray();
  };

  //---------------------------------------------------------------------------
  // Expense operations - require non-anonymous access
  //---------------------------------------------------------------------------
  public shared ({ caller }) func addExpense(
    date : Text,
    description : Text,
    amount : Float,
    category : Text,
    status : Text,
  ) : async Nat {
    authCheck(caller, "Unauthorized: Must be authenticated");

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

  public shared ({ caller }) func updateExpense(
    id : Nat,
    date : Text,
    description : Text,
    amount : Float,
    category : Text,
    status : Text,
  ) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findExpense(id);

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

  public shared ({ caller }) func deleteExpense(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findExpense(id);

    expenses.remove(id);
  };

  public query ({ caller }) func getExpenses() : async [Expense] {
    authCheck(caller, "Unauthorized: Must be authenticated");
    expenses.values().toArray();
  };

  public shared ({ caller }) func markExpensePaid(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let expense = findExpense(id);

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

  //---------------------------------------------------------------------------
  // StaffMember operations - require non-anonymous access
  //---------------------------------------------------------------------------
  public shared ({ caller }) func addStaffMember(name : Text, role : Text, monthlySalary : Float) : async Nat {
    authCheck(caller, "Unauthorized: Must be authenticated");

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
    authCheck(caller, "Unauthorized: Must be authenticated");
    let staff = findStaffMember(id);

    let updatedStaff : StaffMember = {
      id;
      name;
      role;
      monthlySalary;
      totalAdvancePaid = staff.totalAdvancePaid;
    };
    staffMembers.add(id, updatedStaff);
  };

  public shared ({ caller }) func deleteStaffMember(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findStaffMember(id);

    staffMembers.remove(id);
  };

  public query ({ caller }) func getStaffMembers() : async [StaffMember] {
    authCheck(caller, "Unauthorized: Must be authenticated");
    staffMembers.values().toArray();
  };

  //---------------------------------------------------------------------------
  // AdvancePayment operations - require non-anonymous access
  //---------------------------------------------------------------------------
  public shared ({ caller }) func addAdvancePayment(staffId : Nat, date : Text, amount : Float, note : Text) : async Nat {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findStaffMember(staffId);

    let id = nextAdvancePaymentId;
    nextAdvancePaymentId += 1;

    let advancePayment : AdvancePayment = {
      id;
      staffId;
      date;
      amount;
      note;
    };

    advancePayments.add(id, advancePayment);

    // Update totalAdvancePaid on StaffMember
    updateTotalAdvancePaid(staffId);

    id;
  };

  public shared ({ caller }) func deleteAdvancePayment(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let payment = findAdvancePayment(id);
    let staffId = payment.staffId;

    advancePayments.remove(id);

    // Update totalAdvancePaid on StaffMember
    updateTotalAdvancePaid(staffId);
  };

  public query ({ caller }) func getAdvancePayments() : async [AdvancePayment] {
    authCheck(caller, "Unauthorized: Must be authenticated");
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

  //---------------------------------------------------------------------------
  // BuyerAdvancePayment operations - require non-anonymous access
  //---------------------------------------------------------------------------
  public shared ({ caller }) func addBuyerAdvancePayment(date : Text, amount : Float, reason : Text) : async Nat {
    authCheck(caller, "Unauthorized: Must be authenticated");

    let id = nextBuyerAdvancePaymentId;
    nextBuyerAdvancePaymentId += 1;

    let buyerAdvancePayment : BuyerAdvancePayment = {
      id;
      date;
      amount;
      reason;
    };

    buyerAdvancePayments.add(id, buyerAdvancePayment);
    id;
  };

  public shared ({ caller }) func updateBuyerAdvancePayment(id : Nat, date : Text, amount : Float, reason : Text) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findBuyerAdvancePayment(id);

    let updatedPayment : BuyerAdvancePayment = {
      id;
      date;
      amount;
      reason;
    };
    buyerAdvancePayments.add(id, updatedPayment);
  };

  public shared ({ caller }) func deleteBuyerAdvancePayment(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findBuyerAdvancePayment(id);

    buyerAdvancePayments.remove(id);
  };

  public query ({ caller }) func getBuyerAdvancePayments() : async [BuyerAdvancePayment] {
    authCheck(caller, "Unauthorized: Must be authenticated");
    buyerAdvancePayments.values().toArray();
  };

  //---------------------------------------------------------------------------
  // Animal operations - require non-anonymous access
  //---------------------------------------------------------------------------
  public shared ({ caller }) func addAnimal(
    serialNumber : Text,
    animalType : Text,
    name : Text,
    semenDate : Text,
    notes : Text,
  ) : async Nat {
    authCheck(caller, "Unauthorized: Must be authenticated");

    let id = nextAnimalId;
    nextAnimalId += 1;

    let animal : Animal = {
      id;
      serialNumber;
      animalType;
      name;
      semenDate;
      notes;
    };

    animals.add(id, animal);
    id;
  };

  public shared ({ caller }) func updateAnimal(
    id : Nat,
    serialNumber : Text,
    animalType : Text,
    name : Text,
    semenDate : Text,
    notes : Text,
  ) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findAnimal(id);

    let updatedAnimal : Animal = {
      id;
      serialNumber;
      animalType;
      name;
      semenDate;
      notes;
    };
    animals.add(id, updatedAnimal);
  };

  public shared ({ caller }) func deleteAnimal(id : Nat) : async () {
    authCheck(caller, "Unauthorized: Must be authenticated");
    let _ = findAnimal(id);

    animals.remove(id);
  };

  public query ({ caller }) func getAnimals() : async [Animal] {
    authCheck(caller, "Unauthorized: Must be authenticated");
    animals.values().toArray();
  };
};

