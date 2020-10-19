const fs = require('fs');
const inquirer = require('inquirer');
const { run } = require('jest');
const PORT = process.env.PORT || 3001;
const logger = require('morgan');
const mysql = require('mysql2');
const { allowedNodeEnvironmentFlags, exit } = require('process');
const con = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'management'
});

var list = [];
var roleList = [];
var managerList = [];
var employeeList = [];

//Ask the user what they want to do; if they want to view items, simply return the tables
//If they want to update something, call functions to get promises, and make updates.

const runApp = ()=> {
    console.log(`
    =========================================
         Employee Management Application
    =========================================`);
    return inquirer.prompt ([
        {
            type: 'list',
            name: 'optionSelect',
            choices: ['View All Departments', 'View All Roles', 'View All Employees', 'Add A Department',
            'Add A Role', 'Add An Employee', 'Update An Employee Role', 'Exit']
        }
    ]).then(answer=> {
        if(answer.optionSelect === 'View All Departments') {
            viewDepartments();
            runApp();
        } else if(answer.optionSelect === 'View All Roles') {
            viewRoles();
            runApp();
        } else if(answer.optionSelect === 'View All Employees') {
            viewEmployees();
            runApp();
        } else if(answer.optionSelect === 'Add A Role') {
            returnDepartmentNames().then(results=>{
                 list = displayDepartmentNames(results);
                return inquirer.prompt([
                    {
                        type: 'list',
                        name: 'selectDepartment',
                        message: 'Please select department to add a role to: ',
                        choices: list
                    }
                ]).then(selection=>{
                    var dep = selection.selectDepartment.split(" ");
                    var length = dep.length;
                        return inquirer.prompt([
                            {
                                type: 'input',
                                name: 'roleTitle',
                                message: 'Please enter the new role title: '
                            },
                            {
                                type: 'input',
                                name: 'roleSalary',
                                message: 'Please enter the salary for the role: '
                            }
                ]).then(answers=> {
                    addNewRole(answers.roleTitle, answers.roleSalary, dep[length-1]);
                    runApp();
                });
            });
        });

    } else if(answer.optionSelect === 'Add An Employee') {
        returnRoleTitles().then(results=>{
           roleList =  displayRoleTitles(results);
           console.log(roleList);
        }).then(returnManagerNames().then(results=>{
            managerList = displayManagerNames(results);
            return inquirer.prompt([
                {
                    type: 'input',
                    name: 'first_name',
                    message: 'Please enter the first name of the new employee: '
                },
                {
                    type: 'input',
                    name: 'last_name',
                    message: 'Please enter the last name of the new employee: '
                },
                {
                    type: 'list',
                    name: 'roleName',
                    message: "Please select the new employee's role: ",
                    choices: roleList
                },
                {
                    type: 'list',
                    name: 'managerName',
                    message: "Please select the new employee's manager: ",
                    choices: managerList
                }
            ]).then(answers=>{
                var role = answers.roleName.split(' ');
                var manager = answers.managerName.split(' ');
                console.log(manager);
                var roleLength = role.length;
                var managerLength = manager.length;
                addNewEmployee(answers.first_name, answers.last_name, role[roleLength-1], manager[managerLength-1]);
                runApp();
            });
        }));        
    } else if(answer.optionSelect === 'Add A Department') {
        return inquirer.prompt([
            {
                type: 'input',
                name: 'departmentName',
                message: 'Please enter the new department name: '
            }
        ]).then(answer=> {
            addNewDepartment(answer.departmentName);
            runApp();
        });
    } else if(answer.optionSelect === 'Update An Employee Role') {
        returnEmployeeNames().then(results=> {
            employeeList = displayEmployeeNames(results);
        }).then(returnRoleTitles().then(results=> {
            roleList = displayRoleTitles(results);
            return inquirer.prompt([
                {
                    type: 'list',
                    name: 'employeeName',
                    message: 'Please select the employee to update: ',
                    choices: employeeList
                },
                {
                    type: 'list',
                    name: 'roleTitle',
                    message: "Please select the employee's new role: ",
                    choices: roleList
                }
            ]).then(answers=>{
                var employeeInfo = answers.employeeName.split(' ');
                var employeeInfoLength = employeeInfo.length;
                var roleInfo = answers.roleTitle.split(' ');
                var roleInfoLength = roleInfo.length;
                var employeeID = parseInt(roleInfo[roleInfoLength-1]);
                var roleID = parseInt(employeeInfo[employeeInfoLength-1]);
                updateEmployeeRole(employeeID, roleID);
                runApp();
            });
        }));
    } else if(answer.optionSelect === 'Exit') {
        con.close();
        
    }
});
};
    


const viewDepartments = () => {
    const query = con.query(
        'SELECT * FROM department', function(err, res) {
            if(err) throw err;
            console.table(res);
        }
    );
};

const viewRoles = () => {
    const query = con.query(
        'SELECT * FROM role', function(err, res) {
            if(err) throw err;
            console.table(res);
        }
    );
};

const viewEmployees = () => {
    const query = con.query(
        'SELECT a.first_name, a.last_name, b.title, b.salary FROM employee a join role b on a.role_id = b.id',
        function(err,res) {
            if(err) throw err;
            console.table(res);
        }
    );
};


const returnDepartmentNames = () => {
    return new Promise(function(resolve, reject) {
        const query = con.query(
            'SELECT name, id FROM department', function(err, rows) {
                if(err) throw error;
                resolve(rows);
            }
        )
    });
};
    
const displayDepartmentNames = results => {
    const list = [];
    for(var i in results) {
        list.push(results[i].name + " " + results[i].id);
    }
    //con.close();
    return list;
};

const returnRoleTitles = () => {
    return new Promise(function(resolve, reject) {
        const query = con.query(
            'SELECT title, id FROM role', function(err, rows) {
                if(err) throw error;
                resolve(rows);
            }
        )
    });
};

const displayRoleTitles = (results) => {
    for(var i in results) {
        roleList.push(results[i].title + ' ' + results[i].id);
    }
    return roleList;
};

const returnManagerNames = () => {
    return new Promise(function(resolve, reject) {
        const query = con.query(
            'SELECT first_name, last_name, id FROM employee', function(err, rows) {
                if(err) throw error;
                resolve(rows);
            }
        )
    });
};

const displayManagerNames = (results) => {
    for(var i in results) {
        managerList.push(results[i].first_name + ' ' + results[i].last_name + " " + results[i].id);
    }
    return managerList;
};

const returnEmployeeNames = () => {
    return new Promise(function(resolve, reject){
        const query = con.query(
            'SELECT a.first_name, a.last_name, a.id, b.title from employee a join role b on a.role_id = b.id',
            function(err, rows) {
                if(err) throw err;
                resolve(rows)
            }
        )
    });
};

const displayEmployeeNames = (results) => {
    for(var i in results){
        employeeList.push(results[i].first_name + ' ' + results[i].last_name + ' ' + results[i].title + ' ' + results[i].id);
    }
    return employeeList;
}

const addNewRole = (title, salary, department_id) => {
    console.log(title, salary, department_id);
    department_id = parseInt(department_id);
   salary = parseInt(salary);
    const query = con.query(
        'INSERT INTO role SET ?', 
        {
            title: title,
            salary: salary,
            department_id: department_id
        }, 
        function(err, res) {
            if(err) throw err;
            console.log(res.affectedRows+ ' role created');
        }
    )
};

const addNewEmployee = (first_name, last_name, role_id, manager_id ) => {
    console.log(first_name, last_name, role_id, manager_id);
    role_id = parseInt(role_id);
    manager_id = parseInt(manager_id);
    const query = con.query(
        'INSERT INTO employee SET ?',
        {
            first_name: first_name,
            last_name: last_name,
            role_id: role_id,
            manager_id: manager_id
        },
        function(err, res) {
            if(err) throw err;
            console.log(res.affectedRows+ ' employee created');
        }
    )

};

const addNewDepartment = (name) => {
    const query = con.query(
        'INSERT INTO department SET ?',
        {
            name: name
        },
        function(err, res) {
            if(err) throw err;
            console.log(res.affectedRows+ ' department created');
        }
    )
};

const updateEmployeeRole = (employeeID, roleID) => {
    const query = con.query(
        'UPDATE employee SET ? WHERE ?', [
            {
                role_id: roleID
            },
            {
                id: employeeID
            }
        ],
        function(err, res) {
            if(err) throw err;
            console.log(res.affectedRows+ ' employee role updated');
        }
    )
};

runApp();